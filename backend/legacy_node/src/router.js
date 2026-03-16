import { buildCompatReport, buildUserReading } from "./mock-data.js";
import {
  badRequest,
  getRequestUserId,
  json,
  normalizeBlinkCode,
  notFound,
  nowIso,
  randInt,
  readBody,
  generateBlinkCode
} from "./utils.js";

function makeReportId() {
  return `rp_${Date.now().toString(36)}${randInt(1000, 9999)}`;
}

function exposeUserReading(user) {
  return {
    blink_code: user.blink_code,
    mbti: user.mbti,
    attachment: user.attachment,
    poetic_name: user.poetic_name,
    archetype: user.archetype || null,
    monologue: user.monologue,
    profile: user.profile
  };
}

export function createApiRouter({ store, config }) {
  const freeLimit = Number(config.FREE_SUBMIT_LIMIT || 2);
  const autoCompleteMs = Number(config.AUTOCOMPLETE_MS || 4500);

  return async function routeApi(req, res, url) {
    const { pathname, searchParams } = url;
    const method = req.method || "GET";
    const userId = getRequestUserId(req);

    if (method === "OPTIONS") return json(res, 204, { ok: true });

    if (method === "GET" && pathname === "/api/health") {
      return json(res, 200, { ok: true, now: nowIso() });
    }

    if (method === "POST" && pathname === "/api/user/init") {
      const body = await readBody(req);
      const user = store.getOrCreateUser(userId, { lang: body.lang, ref: body.ref });
      await store.save();

      if (user.blink_code) {
        return json(res, 200, {
          ...exposeUserReading(user),
          gender: user.gender,
          current_status: user.current_status,
          free_submits_used: user.free_submits_used || 0,
          pending_report_id: user.pending_report_id || null,
          pending_code_a: user.pending_code_a || null,
          pending_code_b: user.pending_code_b || null
        });
      }

      return json(res, 200, {
        free_submits_used: user.free_submits_used || 0,
        lang: user.lang || "en"
      });
    }

    if (method === "POST" && pathname === "/api/user/submit") {
      const body = await readBody(req);
      const user = store.getOrCreateUser(userId, { lang: body.lang });

      if ((user.free_submits_used || 0) >= freeLimit) {
        return json(res, 402, {
          error: "payment_required",
          free_submits_used: user.free_submits_used || freeLimit
        });
      }

      const reading = buildUserReading(body);
      const newCode = generateBlinkCode(store.getAllCodesSet());
      store.assignBlinkCode(user.user_id, newCode);
      store.saveUserReading(user.user_id, {
        ...reading,
        gender: body.gender || user.gender,
        current_status: body.current_status || user.current_status
      });
      await store.save();

      return json(res, 200, {
        blink_code: newCode,
        ...reading
      });
    }

    if (method === "GET" && pathname === "/api/user/lookup") {
      const code = normalizeBlinkCode(searchParams.get("code"));
      if (!/^BLINK-[A-Z0-9]{6}$/.test(code)) return badRequest(res, "invalid_code_format");
      const target = store.findUserByCode(code);
      if (!target || !target.blink_code) return notFound(res, "user_not_found");
      return json(res, 200, exposeUserReading(target));
    }

    if (method === "POST" && pathname === "/api/user/retest-invoice") {
      return json(res, 200, {
        invoice_link: "https://t.me/blink_aimatch_bot?start=retest_mock",
        amount_stars: 25
      });
    }

    if (method === "GET" && pathname === "/api/compat/history") {
      const storeUser = store.getOrCreateUser(userId);
      const history = store
        .listHistoryByUser(storeUser.user_id)
        .map((item) => ({
          report_id: item.report_id,
          code_a: item.code_a,
          code_b: item.code_b,
          compat_score: item.report?.compat_score ?? null
        }));
      return json(res, 200, { history });
    }

    if (method === "POST" && pathname === "/api/compat/invoice") {
      const body = await readBody(req);
      const codeA = normalizeBlinkCode(body.code_a);
      const codeB = normalizeBlinkCode(body.code_b);

      if (!/^BLINK-[A-Z0-9]{6}$/.test(codeA) || !/^BLINK-[A-Z0-9]{6}$/.test(codeB)) {
        return badRequest(res, "invalid_code_format");
      }
      if (codeA === codeB) return badRequest(res, "codes_must_be_different");

      const personA = store.findUserByCode(codeA);
      const personB = store.findUserByCode(codeB);
      if (!personA || !personB) return notFound(res, "user_not_found");

      const report_id = makeReportId();
      const owner = store.getOrCreateUser(userId);

      store.createReport({
        report_id,
        owner_user_id: owner.user_id,
        code_a: codeA,
        code_b: codeB,
        status: "pending",
        report: null,
        created_at: nowIso(),
        generated_at: null,
        updated_at: nowIso()
      });
      store.setPendingReport(owner.user_id, report_id, codeA, codeB);
      await store.save();

      return json(res, 200, {
        invoice_link: `https://t.me/blink_aimatch_bot?start=compat_${report_id}`,
        report_id
      });
    }

    if (method === "POST" && pathname === "/api/compat/retry") {
      const body = await readBody(req);
      const reportId = String(body.report_id || "").trim();
      if (!reportId) return badRequest(res, "missing_report_id");
      const report = store.getReport(reportId);
      if (!report) return notFound(res, "report_not_found");

      store.markReportPending(reportId);
      store.setPendingReport(report.owner_user_id, reportId, report.code_a, report.code_b);
      await store.save();

      return json(res, 200, { ok: true, status: "pending" });
    }

    if (method === "GET" && pathname.startsWith("/api/compat/status/")) {
      const reportId = pathname.split("/").pop();
      const report = store.getReport(reportId);
      if (!report) return notFound(res, "report_not_found");

      if (report.status === "pending") {
        const createdMs = new Date(report.created_at).getTime();
        if (Date.now() - createdMs >= autoCompleteMs) {
          const personA = store.findUserByCode(report.code_a);
          const personB = store.findUserByCode(report.code_b);

          if (!personA || !personB) {
            report.status = "failed";
            report.updated_at = nowIso();
          } else {
            const payload = buildCompatReport(personA, personB, report.code_a, report.code_b);
            store.markReportDone(reportId, payload);
          }
          await store.save();
        }
      }

      if (report.status === "done") {
        return json(res, 200, { status: "done", report: report.report });
      }
      if (report.status === "failed") {
        return json(res, 200, { status: "failed" });
      }
      return json(res, 200, { status: "pending" });
    }

    return notFound(res, "route_not_found");
  };
}
