import { defineStore } from "pinia";
import { apiCall } from "../api/client";
import { useTelegramWebApp } from "../composables/useTelegramWebApp";
import { loadPreviewProfile } from "../utils/previewProfile";
import { useProfileStore } from "./useProfileStore";

const LANG_KEY = "blink_lang";
const PENDING_DUAL_KEY = "blink_pending_dual";

function readPersistedLang() {
  try {
    const value = localStorage.getItem(LANG_KEY);
    return value === "ru" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

function readPendingDualIntent() {
  try {
    return localStorage.getItem(PENDING_DUAL_KEY) === "true";
  } catch {
    return false;
  }
}

function parseRefUserId(startParam = "") {
  return startParam.startsWith("ref_") ? startParam.slice(4) : null;
}

function getPreferredTelegramLang() {
  const { getLanguageCode } = useTelegramWebApp();
  const languageCode = getLanguageCode();
  if (!languageCode) return "en";
  const code = String(languageCode).toLowerCase();
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("ru")) return "ru";
  return "en";
}

export const useSessionStore = defineStore("session", {
  state: () => {
    const persistedLang = readPersistedLang();

    return {
      lang: persistedLang || "en",
      languageOverridden: Boolean(persistedLang),
      initPayload: null,
      initError: null,
      isBootstrapping: false,
      isBootstrapped: false,
      browserPreview: false,
      pendingDualIntent: readPendingDualIntent(),
      pendingReportId: null,
      pendingCodeA: "",
      pendingCodeB: "",
      tgUserId: null,
      refUserId: null,
    };
  },
  getters: {
    hasPendingReport: (state) => Boolean(state.pendingReportId),
  },
  actions: {
    setLang(lang) {
      if (!["en", "ru", "zh"].includes(lang)) return;

      this.lang = lang;
      this.languageOverridden = true;

      try {
        localStorage.setItem(LANG_KEY, lang);
      } catch {
        // ignore storage failures
      }
    },
    syncPreferredLanguage() {
      if (this.languageOverridden) return;
      this.lang = getPreferredTelegramLang();
    },
    setPendingDualIntent(value) {
      this.pendingDualIntent = Boolean(value);
      try {
        localStorage.setItem(PENDING_DUAL_KEY, this.pendingDualIntent ? "true" : "false");
      } catch {
        // ignore storage failures
      }
    },
    consumePendingDualIntent() {
      const value = this.pendingDualIntent;
      this.setPendingDualIntent(false);
      return value;
    },
    applyInitPayload(data) {
      this.initPayload = data;
      this.pendingReportId = data?.pending_report_id || null;
      this.pendingCodeA = data?.pending_code_a || "";
      this.pendingCodeB = data?.pending_code_b || "";
    },
    clearPendingReport() {
      this.pendingReportId = null;
      this.pendingCodeA = "";
      this.pendingCodeB = "";
      if (this.initPayload) {
        this.initPayload = {
          ...this.initPayload,
          pending_report_id: null,
          pending_code_a: null,
          pending_code_b: null,
        };
      }
    },
    setPendingReport({ reportId, codeA = "", codeB = "" }) {
      this.pendingReportId = reportId || null;
      this.pendingCodeA = codeA;
      this.pendingCodeB = codeB;
      if (this.initPayload) {
        this.initPayload = {
          ...this.initPayload,
          pending_report_id: this.pendingReportId,
          pending_code_a: codeA || null,
          pending_code_b: codeB || null,
        };
      }
    },
    async initUser() {
      const { getUserId, getStartParam } = useTelegramWebApp();
      this.syncPreferredLanguage();
      this.tgUserId = getUserId();
      this.refUserId = parseRefUserId(getStartParam());

      const data = await apiCall("/api/user/init", {
        method: "POST",
        body: {
          lang: this.lang,
          ref: this.refUserId,
        },
      });

      this.browserPreview = false;
      this.initError = null;
      this.applyInitPayload(data);
      return data;
    },
    async bootstrap() {
      this.isBootstrapping = true;
      const profileStore = useProfileStore();

      try {
        const data = await this.initUser();
        if (data?.blink_code) {
          profileStore.setProfileFromResponse(data);
        }
        return { ok: true, data };
      } catch (error) {
        this.initError = error;
        this.browserPreview = true;
        const preview = loadPreviewProfile();
        if (preview) {
          profileStore.setProfileFromResponse(preview);
        }
        return { ok: false, error, preview };
      } finally {
        this.isBootstrapping = false;
        this.isBootstrapped = true;
      }
    },
  },
});
