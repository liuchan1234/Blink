import fs from "node:fs/promises";
import path from "node:path";
import { fileExists, nowIso } from "./utils.js";

const EMPTY_DB = {
  users: {},
  codeIndex: {},
  reports: {}
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export class JsonStore {
  constructor(dbFile) {
    this.dbFile = dbFile;
    this.db = clone(EMPTY_DB);
  }

  async init() {
    const dir = path.dirname(this.dbFile);
    await fs.mkdir(dir, { recursive: true });

    if (!(await fileExists(this.dbFile))) {
      await this.save();
      return;
    }

    try {
      const raw = await fs.readFile(this.dbFile, "utf8");
      const parsed = JSON.parse(raw);
      this.db = { ...clone(EMPTY_DB), ...parsed };
      this.db.users = this.db.users || {};
      this.db.codeIndex = this.db.codeIndex || {};
      this.db.reports = this.db.reports || {};
    } catch {
      this.db = clone(EMPTY_DB);
      await this.save();
    }
  }

  async save() {
    const raw = JSON.stringify(this.db, null, 2);
    await fs.writeFile(this.dbFile, raw, "utf8");
  }

  getAllCodesSet() {
    return new Set(Object.keys(this.db.codeIndex));
  }

  getUser(userId) {
    return this.db.users[userId] || null;
  }

  getOrCreateUser(userId, attrs = {}) {
    let user = this.getUser(userId);
    if (!user) {
      user = {
        user_id: userId,
        created_at: nowIso(),
        updated_at: nowIso(),
        lang: attrs.lang || "en",
        ref: attrs.ref || null,
        free_submits_used: 0,
        history_report_ids: [],
        pending_report_id: null,
        pending_code_a: null,
        pending_code_b: null,
        blink_code: null,
        mbti: null,
        attachment: null,
        poetic_name: null,
        archetype: null,
        monologue: null,
        profile: null,
        gender: null,
        current_status: null
      };
      this.db.users[userId] = user;
    } else {
      user.lang = attrs.lang || user.lang || "en";
      if (attrs.ref) user.ref = attrs.ref;
      user.updated_at = nowIso();
    }
    return user;
  }

  findUserByCode(code) {
    const userId = this.db.codeIndex[code];
    if (!userId) return null;
    return this.getUser(userId);
  }

  assignBlinkCode(userId, nextCode) {
    const user = this.getUser(userId);
    if (!user) return null;
    if (user.blink_code) delete this.db.codeIndex[user.blink_code];
    user.blink_code = nextCode;
    this.db.codeIndex[nextCode] = userId;
    user.updated_at = nowIso();
    return user;
  }

  saveUserReading(userId, reading) {
    const user = this.getUser(userId);
    if (!user) return null;
    user.free_submits_used = (user.free_submits_used || 0) + 1;
    user.mbti = reading.mbti;
    user.attachment = reading.attachment;
    user.poetic_name = reading.poetic_name;
    user.archetype = reading.archetype || null;
    user.monologue = reading.monologue;
    user.profile = reading.profile;
    user.gender = reading.gender || user.gender || null;
    user.current_status = reading.current_status || user.current_status || null;
    user.updated_at = nowIso();
    return user;
  }

  createReport(report) {
    this.db.reports[report.report_id] = report;
    return report;
  }

  getReport(reportId) {
    return this.db.reports[reportId] || null;
  }

  setPendingReport(userId, reportId, codeA, codeB) {
    const user = this.getUser(userId);
    if (!user) return null;
    user.pending_report_id = reportId;
    user.pending_code_a = codeA;
    user.pending_code_b = codeB;
    user.updated_at = nowIso();
    return user;
  }

  clearPendingReport(userId, reportId = null) {
    const user = this.getUser(userId);
    if (!user) return null;
    if (reportId && user.pending_report_id !== reportId) return user;
    user.pending_report_id = null;
    user.pending_code_a = null;
    user.pending_code_b = null;
    user.updated_at = nowIso();
    return user;
  }

  markReportDone(reportId, reportData) {
    const report = this.getReport(reportId);
    if (!report) return null;

    report.status = "done";
    report.generated_at = nowIso();
    report.report = reportData;
    report.updated_at = nowIso();

    const owner = this.getUser(report.owner_user_id);
    if (owner) {
      if (!owner.history_report_ids.includes(reportId)) owner.history_report_ids.unshift(reportId);
      this.clearPendingReport(owner.user_id, reportId);
    }
    return report;
  }

  markReportPending(reportId) {
    const report = this.getReport(reportId);
    if (!report) return null;
    report.status = "pending";
    report.report = null;
    report.created_at = nowIso();
    report.generated_at = null;
    report.updated_at = nowIso();
    return report;
  }

  listHistoryByUser(userId) {
    return Object.values(this.db.reports)
      .filter((r) => r.owner_user_id === userId && r.status === "done" && r.report)
      .sort((a, b) => new Date(b.generated_at || b.updated_at) - new Date(a.generated_at || a.updated_at));
  }
}
