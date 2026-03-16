import { defineStore } from "pinia";
import { apiCall } from "../api/client";
import { useTelegramWebApp } from "../composables/useTelegramWebApp";
import { BIRTH_YEAR_OPTIONS, QUIZ_QUESTIONS } from "../utils/constants";
import { translate } from "../utils/i18n";
import { buildPreviewProfileResult, clearPreviewProfile, savePreviewProfile } from "../utils/previewProfile";
import { useProfileStore } from "./useProfileStore";
import { useSessionStore } from "./useSessionStore";
import { useUiStore } from "./useUiStore";

const DEFAULT_BIRTH_YEAR = BIRTH_YEAR_OPTIONS.includes(2000) ? 2000 : BIRTH_YEAR_OPTIONS[0];

function defaultQuizState() {
  return {
    gender: "female",
    birthYear: DEFAULT_BIRTH_YEAR,
    zodiac: "aries",
    relHistory: 0,
    currentStatus: "single",
    emotion: "joy",
    quizAnswers: Array.from({ length: QUIZ_QUESTIONS.length }, () => null),
    submitting: false,
    submitError: null,
    freeSubmitsUsed: 0,
    paidRetestReady: false,
  };
}

const ERROR_CODE_TO_I18N = {
  payment_required: "paymentRequired",
  duplicate_submit: "duplicateSubmit",
  rate_limited: "rateLimited",
};

function normalizeSubmitError(error) {
  const code = error?.data?.error || "generic_error";

  if (error?.status === 402 || code === "payment_required") {
    return { status: 402, code: "payment_required" };
  }

  if (error?.status === 409 || code === "duplicate_submit") {
    return { status: 409, code: "duplicate_submit" };
  }

  if (error?.status === 429 || code === "rate_limited") {
    return { status: 429, code: "rate_limited" };
  }

  return {
    status: error?.status || null,
    code,
    rawMessage: error?.data?.detail || error?.message || "Something went wrong. Please try again.",
  };
}

export const useQuizStore = defineStore("quiz", {
  state: () => defaultQuizState(),
  getters: {
    isProfileComplete: (state) => Boolean(state.gender && state.birthYear && state.zodiac),
    isEmotionSelected: (state) => Boolean(state.emotion),
    isQuizComplete: (state) => state.quizAnswers.every((value) => typeof value === "number"),
    questionCount: () => QUIZ_QUESTIONS.length,
  },
  actions: {
    setProfileField(field, value) {
      if (["gender", "birthYear", "zodiac", "relHistory", "currentStatus"].includes(field)) {
        this[field] = value;
      }
    },
    setEmotion(option) {
      this.emotion = option.value;
      this.currentStatus = option.status;
    },
    setAnswer(index, value) {
      this.quizAnswers.splice(index, 1, Number(value));
    },
    clearSubmitError() {
      this.submitError = null;
    },
    buildPayload({ paidSubmit = false } = {}) {
      const sessionStore = useSessionStore();
      return {
        gender: this.gender,
        birth_year: this.birthYear,
        zodiac: this.zodiac,
        rel_history: this.relHistory,
        current_status: this.currentStatus,
        emotion: this.emotion,
        quiz_answers: this.quizAnswers.map((value) => Number(value || 3)),
        lang: sessionStore.lang,
        paid_submit: paidSubmit || this.paidRetestReady,
      };
    },
    async submitQuiz({ paidSubmit = false } = {}) {
      const sessionStore = useSessionStore();
      const profileStore = useProfileStore();
      const uiStore = useUiStore();

      this.submitting = true;
      this.submitError = null;
      uiStore.clearError();

      const payload = this.buildPayload({ paidSubmit });

      try {
        let data;

        if (sessionStore.browserPreview) {
          data = buildPreviewProfileResult(payload);
          savePreviewProfile(data);
        } else {
          data = await apiCall("/api/user/submit", {
            method: "POST",
            body: payload,
          });
        }

        profileStore.setProfileFromResponse(data);
        this.freeSubmitsUsed = data.free_submits_used ?? this.freeSubmitsUsed;
        this.paidRetestReady = false;
        return { ok: true, data };
      } catch (error) {
        const normalized = normalizeSubmitError(error);
        this.submitError = normalized;
        this.freeSubmitsUsed = error?.data?.free_submits_used ?? this.freeSubmitsUsed;
        const message =
          ERROR_CODE_TO_I18N[normalized.code]
            ? translate(sessionStore.lang, ERROR_CODE_TO_I18N[normalized.code])
            : normalized.rawMessage || translate(sessionStore.lang, "genericError");
        uiStore.showError(message, { status: normalized.status, code: normalized.code });
        return { ok: false, error: normalized };
      } finally {
        this.submitting = false;
      }
    },
    async startRetestCheckout() {
      const sessionStore = useSessionStore();
      const uiStore = useUiStore();
      const { openInvoice } = useTelegramWebApp();

      try {
        if (sessionStore.browserPreview) {
          this.paidRetestReady = true;
          uiStore.showToast(translate(sessionStore.lang, "browserPreview"), "info");
          return { ok: true, status: "preview" };
        }

        const data = await apiCall("/api/user/retest-invoice", { method: "POST" });
        const status = await openInvoice(data.invoice_link);

        if (status === "paid") {
          this.paidRetestReady = true;
          uiStore.showToast("Result ready", "success");
          return { ok: true, status };
        }

        if (status === "preview") {
          this.paidRetestReady = true;
          return { ok: true, status };
        }

        if (status === "cancelled") {
          return { ok: false, status };
        }

        uiStore.showError(translate(sessionStore.lang, "openInTelegram"));
        return { ok: false, status: status || "unknown" };
      } catch (error) {
        const message =
          error?.data?.detail || error?.message || translate(sessionStore.lang, "genericError");
        uiStore.showError(message, { status: error?.status, code: error?.data?.error || "invoice_error" });
        return { ok: false, error };
      }
    },
    prepareForRetake() {
      this.quizAnswers = Array.from({ length: QUIZ_QUESTIONS.length }, () => null);
      this.submitError = null;
      clearPreviewProfile();
      const profileStore = useProfileStore();
      profileStore.clear();
    },
    resetAll() {
      Object.assign(this, defaultQuizState());
    },
  },
});
