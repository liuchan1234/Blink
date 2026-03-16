import { defineStore } from "pinia";
import { apiCall } from "../api/client";

const defaultSubmit = {
  gender: "female",
  birth_year: 2000,
  zodiac: "aries",
  rel_history: 0,
  current_status: "single",
  emotion: "open",
  quiz_answers: [3, 4, 3, 2, 4, 3, 2, 4, 3, 2],
  lang: "en",
};

export const useAppStore = defineStore("app", {
  state: () => ({
    lang: "en",
    initData: null,
    submitPayload: { ...defaultSubmit },
    result: null,
    freeSubmitsUsed: 0,

    codeA: "",
    codeB: "",
    lookupA: null,
    lookupB: null,

    invoice: null,
    reportStatus: null,
    report: null,
    history: [],

    loading: false,
    error: "",
  }),
  actions: {
    clearError() {
      this.error = "";
    },
    setError(err) {
      this.error = err?.data?.detail || err?.data?.error || err?.message || "unknown_error";
    },

    async initUser() {
      this.clearError();
      this.loading = true;
      try {
        const data = await apiCall("/api/user/init", {
          method: "POST",
          body: { lang: this.lang, ref: null },
        });
        this.initData = data;
        this.freeSubmitsUsed = data.free_submits_used ?? this.freeSubmitsUsed;
        if (data.pending_report_id) {
          this.reportStatus = { status: "pending", report_id: data.pending_report_id };
        }
      } catch (err) {
        this.setError(err);
      } finally {
        this.loading = false;
      }
    },

    async submitQuiz() {
      this.clearError();
      this.loading = true;
      try {
        this.submitPayload.lang = this.lang;
        const data = await apiCall("/api/user/submit", {
          method: "POST",
          body: this.submitPayload,
        });
        this.result = data;
        this.freeSubmitsUsed = data.free_submits_used ?? this.freeSubmitsUsed;
      } catch (err) {
        this.setError(err);
      } finally {
        this.loading = false;
      }
    },

    async createRetestInvoice() {
      this.clearError();
      this.loading = true;
      try {
        const data = await apiCall("/api/user/retest-invoice", { method: "POST" });
        return data;
      } catch (err) {
        this.setError(err);
        return null;
      } finally {
        this.loading = false;
      }
    },

    async lookupBothCodes() {
      this.clearError();
      this.loading = true;
      try {
        const [a, b] = await Promise.all([
          apiCall(`/api/user/lookup?code=${encodeURIComponent(this.codeA)}`),
          apiCall(`/api/user/lookup?code=${encodeURIComponent(this.codeB)}`),
        ]);
        this.lookupA = a;
        this.lookupB = b;
      } catch (err) {
        this.setError(err);
      } finally {
        this.loading = false;
      }
    },

    async createCompatInvoice() {
      this.clearError();
      this.loading = true;
      try {
        const data = await apiCall("/api/compat/invoice", {
          method: "POST",
          body: { code_a: this.codeA, code_b: this.codeB },
        });
        this.invoice = data;
        this.reportStatus = { status: "pending", report_id: data.report_id };
      } catch (err) {
        this.setError(err);
      } finally {
        this.loading = false;
      }
    },

    async pollCompatStatus() {
      if (!this.reportStatus?.report_id) return;
      this.clearError();
      this.loading = true;
      try {
        const data = await apiCall(`/api/compat/status/${this.reportStatus.report_id}`);
        this.reportStatus = { ...data, report_id: this.reportStatus.report_id };
        if (data.status === "done") {
          this.report = data.report;
        }
      } catch (err) {
        this.setError(err);
      } finally {
        this.loading = false;
      }
    },

    async retryCompat() {
      if (!this.reportStatus?.report_id) return;
      this.clearError();
      this.loading = true;
      try {
        const data = await apiCall("/api/compat/retry", {
          method: "POST",
          body: { report_id: this.reportStatus.report_id },
        });
        this.reportStatus = { ...data, report_id: this.reportStatus.report_id };
        this.report = null;
      } catch (err) {
        this.setError(err);
      } finally {
        this.loading = false;
      }
    },

    async loadHistory() {
      this.clearError();
      this.loading = true;
      try {
        const data = await apiCall("/api/compat/history");
        this.history = data.history || [];
      } catch (err) {
        this.setError(err);
      } finally {
        this.loading = false;
      }
    },
  },
});
