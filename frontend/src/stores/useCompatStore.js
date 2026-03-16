import { defineStore } from "pinia";
import { apiCall } from "../api/client";
import { useCompatPolling } from "../composables/useCompatPolling";
import { useTelegramWebApp } from "../composables/useTelegramWebApp";
import { isValidBlinkCode, normalizeBlinkCode, normalizeBlinkCodeInput } from "../utils/blink";
import { buildPreviewCompatReport } from "../utils/compatPreview";
import { buildPreviewLookup } from "../utils/previewLookup";
import {
  listPreviewCompatHistory,
  loadPreviewCompatReport,
  savePreviewCompatReport,
} from "../utils/previewCompatStorage";
import { useProfileStore } from "./useProfileStore";
import { useSessionStore } from "./useSessionStore";
import { useUiStore } from "./useUiStore";

let pollingController = null;
const previewPendingReports = new Map();

function createState() {
  return {
    codeA: "",
    codeB: "",
    codeErrors: {
      codeA: "",
      codeB: "",
    },
    lookupA: null,
    lookupB: null,
    currentReportId: null,
    currentReport: null,
    currentStatus: null,
    currentErrorCode: "",
    retryCount: 0,
    history: [],
    historyLoaded: false,
    historyLoading: false,
    lookupLoading: false,
    checkoutLoading: false,
    retryLoading: false,
  };
}

function normalizeCompatError(error) {
  const code = error?.data?.error || "compat_error";

  if (code === "invalid_code_format") {
    return "Enter a valid BLINK code.";
  }

  if (code === "codes_must_be_different") {
    return "Codes must be different.";
  }

  if (code === "not_found") {
    return "User not found.";
  }

  if (code === "retry_exhausted") {
    return "Retry limit exceeded for this report.";
  }

  return error?.data?.detail || error?.message || "Something went wrong. Please try again.";
}

function previewStatusPayload(reportId) {
  const queued = previewPendingReports.get(reportId);
  if (!queued) {
    const stored = loadPreviewCompatReport(reportId);
    if (!stored) {
      const notFoundError = new Error("Report not found.");
      notFoundError.status = 404;
      notFoundError.data = { error: "not_found" };
      throw notFoundError;
    }

    return {
      status: "done",
      retry_count: stored.retry_count || 0,
      report: stored.report,
    };
  }

  if (Date.now() >= queued.readyAt) {
    previewPendingReports.delete(reportId);
    savePreviewCompatReport({
      report_id: reportId,
      code_a: queued.codeA,
      code_b: queued.codeB,
      report: queued.report,
      retry_count: queued.retryCount || 0,
      lang: queued.lang || "en",
      generated_at: queued.report.generated_at,
    });

    return {
      status: "done",
      retry_count: queued.retryCount || 0,
      report: queued.report,
    };
  }

  return {
    status: "generating",
    retry_count: queued.retryCount || 0,
  };
}

export const useCompatStore = defineStore("compat", {
  state: () => createState(),
  getters: {
    canSubmitCompat: (state) => isValidBlinkCode(state.codeA) && isValidBlinkCode(state.codeB) && state.codeA !== state.codeB,
    isCurrentReportPending: (state) => ["pending", "generating"].includes(state.currentStatus),
    isCurrentReportDone: (state) => state.currentStatus === "done" && Boolean(state.currentReport),
    isCurrentReportFailed: (state) => state.currentStatus === "failed",
  },
  actions: {
    setCode(field, value) {
      const normalized = normalizeBlinkCodeInput(value);
      if (field === "codeA") {
        this.codeA = normalized;
      }
      if (field === "codeB") {
        this.codeB = normalized;
      }
      this.codeErrors[field] = "";
    },
    setCodeError(field, message) {
      this.codeErrors[field] = message;
    },
    clearCodeErrors() {
      this.codeErrors = {
        codeA: "",
        codeB: "",
      };
    },
    fillMineCode() {
      const profileStore = useProfileStore();
      if (!profileStore.blinkCode) {
        return false;
      }

      this.codeA = profileStore.blinkCode;
      this.codeErrors.codeA = "";
      return true;
    },
    swapCodes() {
      const nextA = this.codeB;
      const nextB = this.codeA;
      this.codeA = nextA;
      this.codeB = nextB;
      this.clearCodeErrors();
    },
    restorePendingReport({ reportId, codeA = "", codeB = "" }) {
      const sessionStore = useSessionStore();
      this.currentReportId = reportId;
      this.currentStatus = "pending";
      this.currentReport = null;
      this.currentErrorCode = "";
      this.codeA = codeA || this.codeA;
      this.codeB = codeB || this.codeB;
      sessionStore.setPendingReport({ reportId, codeA: this.codeA, codeB: this.codeB });
    },
    applyCompatStatus(data, reportId) {
      const sessionStore = useSessionStore();
      this.currentReportId = reportId;
      this.currentStatus = data?.status || null;
      this.retryCount = data?.retry_count ?? data?.retryCount ?? this.retryCount;
      this.currentErrorCode = data?.error_code || "";

      if (data?.report) {
        this.currentReport = data.report;
        this.codeA = data.report.code_a || this.codeA;
        this.codeB = data.report.code_b || this.codeB;
      } else if (data?.status !== "done") {
        this.currentReport = null;
      }

      if (["pending", "generating"].includes(this.currentStatus)) {
        sessionStore.setPendingReport({ reportId, codeA: this.codeA, codeB: this.codeB });
      } else if (["done", "failed"].includes(this.currentStatus)) {
        sessionStore.clearPendingReport();
      }
    },
    validateCodes() {
      this.clearCodeErrors();

      const normalizedA = normalizeBlinkCode(this.codeA);
      const normalizedB = normalizeBlinkCode(this.codeB);
      this.codeA = normalizedA;
      this.codeB = normalizedB;

      if (!isValidBlinkCode(normalizedA)) {
        this.setCodeError("codeA", "Enter a valid BLINK code.");
        return false;
      }

      if (!isValidBlinkCode(normalizedB)) {
        this.setCodeError("codeB", "Enter a valid BLINK code.");
        return false;
      }

      if (normalizedA === normalizedB) {
        this.setCodeError("codeB", "Codes must be different.");
        return false;
      }

      return true;
    },
    async lookupCode(code) {
      const sessionStore = useSessionStore();
      if (sessionStore.browserPreview) {
        return buildPreviewLookup(code);
      }

      return apiCall(`/api/user/lookup?code=${encodeURIComponent(code)}`);
    },
    async prepareCompatConfirmation() {
      const uiStore = useUiStore();
      uiStore.clearError();

      if (!this.validateCodes()) {
        return { ok: false };
      }

      this.lookupLoading = true;

      try {
        const [resultA, resultB] = await Promise.allSettled([
          this.lookupCode(this.codeA),
          this.lookupCode(this.codeB),
        ]);

        if (resultA.status === "rejected") {
          const error = resultA.reason;
          this.setCodeError("codeA", normalizeCompatError(error));
          return { ok: false, error };
        }

        if (resultB.status === "rejected") {
          const error = resultB.reason;
          this.setCodeError("codeB", normalizeCompatError(error));
          return { ok: false, error };
        }

        this.lookupA = resultA.value;
        this.lookupB = resultB.value;

        uiStore.openCompatConfirm({
          codeA: this.codeA,
          codeB: this.codeB,
          poeticNameA: this.lookupA?.poetic_name || "",
          poeticNameB: this.lookupB?.poetic_name || "",
        });

        return {
          ok: true,
          data: {
            lookupA: this.lookupA,
            lookupB: this.lookupB,
          },
        };
      } catch (error) {
        uiStore.showError(normalizeCompatError(error), { status: error?.status, code: error?.data?.error || "compat_lookup_error" });
        return { ok: false, error };
      } finally {
        this.lookupLoading = false;
      }
    },
    async startCompatCheckout() {
      const sessionStore = useSessionStore();
      const uiStore = useUiStore();
      const { openInvoice } = useTelegramWebApp();

      this.checkoutLoading = true;
      uiStore.setCompatConfirmLoading(true);
      uiStore.clearError();

      try {
        if (sessionStore.browserPreview) {
          const reportId = `preview-${Date.now()}`;
          const report = buildPreviewCompatReport(this.codeA, this.codeB);
          previewPendingReports.set(reportId, {
            readyAt: Date.now() + 3200,
            report,
            codeA: this.codeA,
            codeB: this.codeB,
            retryCount: 0,
            lang: sessionStore.lang,
          });

          this.currentReportId = reportId;
          this.currentStatus = "generating";
          this.currentReport = null;
          this.currentErrorCode = "";
          this.retryCount = 0;
          uiStore.closeCompatConfirm();
          uiStore.showToast("Browser preview mode is active.", "info");
          return { ok: true, reportId, status: "preview" };
        }

        const invoice = await apiCall("/api/compat/invoice", {
          method: "POST",
          body: {
            code_a: this.codeA,
            code_b: this.codeB,
          },
        });

        this.currentReportId = invoice.report_id;
        this.currentStatus = "pending";
        this.currentReport = null;
        this.currentErrorCode = "";
        this.retryCount = 0;

        const status = await openInvoice(invoice.invoice_link);
        uiStore.closeCompatConfirm();

        if (status === "paid" || status === "preview") {
          this.currentStatus = "generating";
          return { ok: true, reportId: invoice.report_id, status };
        }

        if (status === "cancelled") {
          return { ok: false, reportId: invoice.report_id, status };
        }

        uiStore.showError("Open in Telegram to complete payment.");
        return { ok: false, reportId: invoice.report_id, status: status || "unknown" };
      } catch (error) {
        uiStore.showError(normalizeCompatError(error), {
          status: error?.status,
          code: error?.data?.error || "compat_checkout_error",
        });
        return { ok: false, error };
      } finally {
        this.checkoutLoading = false;
        uiStore.setCompatConfirmLoading(false);
      }
    },
    async fetchCompatStatus(reportId) {
      const sessionStore = useSessionStore();
      if (sessionStore.browserPreview && String(reportId).startsWith("preview-")) {
        return previewStatusPayload(reportId);
      }

      return apiCall(`/api/compat/status/${reportId}`);
    },
    async fetchReport(reportId) {
      const uiStore = useUiStore();
      try {
        const data = await this.fetchCompatStatus(reportId);
        this.applyCompatStatus(data, reportId);
        return { ok: true, data };
      } catch (error) {
        uiStore.showError(normalizeCompatError(error), {
          status: error?.status,
          code: error?.data?.error || "compat_status_error",
        });
        return { ok: false, error };
      }
    },
    async startPolling(reportId = this.currentReportId) {
      const uiStore = useUiStore();
      if (!reportId) return;

      if (pollingController) {
        pollingController.stop();
      }

      pollingController = useCompatPolling({
        fetchStatus: (activeReportId) => this.fetchCompatStatus(activeReportId),
        onPending: (data, activeReportId) => {
          this.applyCompatStatus(data, activeReportId);
        },
        onDone: (data, activeReportId) => {
          this.applyCompatStatus(data, activeReportId);
          this.historyLoaded = false;
          void this.loadHistory();
        },
        onFailed: (data, activeReportId) => {
          this.applyCompatStatus(data, activeReportId);
        },
        onTimeout: () => {
          uiStore.showToast("Generating report", "info");
        },
        onError: () => {
          // keep polling silently on transient failures
        },
      });

      await pollingController.start(reportId);
    },
    stopPolling() {
      pollingController?.stop();
    },
    async ensureReportLoaded(reportId) {
      if (this.currentReportId !== reportId || !this.currentStatus) {
        const result = await this.fetchReport(reportId);
        if (!result.ok) return result;
      }

      if (["pending", "generating"].includes(this.currentStatus)) {
        await this.startPolling(reportId);
      }

      return { ok: true };
    },
    async retryCompatReport() {
      const sessionStore = useSessionStore();
      const uiStore = useUiStore();
      if (!this.currentReportId) return { ok: false };

      this.retryLoading = true;
      uiStore.clearError();

      try {
        if (sessionStore.browserPreview && String(this.currentReportId).startsWith("preview-")) {
          const report = buildPreviewCompatReport(this.codeA, this.codeB);
          previewPendingReports.set(this.currentReportId, {
            readyAt: Date.now() + 2200,
            report,
            codeA: this.codeA,
            codeB: this.codeB,
            retryCount: this.retryCount + 1,
            lang: sessionStore.lang,
          });
          this.currentStatus = "generating";
          this.currentErrorCode = "";
          this.retryCount += 1;
          await this.startPolling(this.currentReportId);
          return { ok: true };
        }

        const data = await apiCall("/api/compat/retry", {
          method: "POST",
          body: { report_id: this.currentReportId },
        });

        this.currentStatus = data.status || "generating";
        this.retryCount = data.retry_count ?? this.retryCount;
        this.currentErrorCode = "";
        await this.startPolling(this.currentReportId);
        return { ok: true, data };
      } catch (error) {
        uiStore.showError(normalizeCompatError(error), {
          status: error?.status,
          code: error?.data?.error || "compat_retry_error",
        });
        return { ok: false, error };
      } finally {
        this.retryLoading = false;
      }
    },
    async loadHistory() {
      const sessionStore = useSessionStore();
      const uiStore = useUiStore();
      this.historyLoading = true;

      try {
        if (sessionStore.browserPreview) {
          this.history = listPreviewCompatHistory();
          this.historyLoaded = true;
          return { ok: true, data: this.history };
        }

        const data = await apiCall("/api/compat/history");
        this.history = data.history || [];
        this.historyLoaded = true;
        return { ok: true, data: this.history };
      } catch (error) {
        uiStore.showError(normalizeCompatError(error), {
          status: error?.status,
          code: error?.data?.error || "compat_history_error",
        });
        return { ok: false, error };
      } finally {
        this.historyLoading = false;
      }
    },
    reset() {
      this.stopPolling();
      Object.assign(this, createState());
    },
  },
});
