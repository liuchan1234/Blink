import { defineStore } from "pinia";

let toastTimer = null;

function createErrorBanner() {
  return {
    visible: false,
    message: "",
    status: null,
    code: "",
  };
}

function createToast() {
  return {
    visible: false,
    message: "",
    type: "info",
  };
}

function createCompatConfirmState() {
  return {
    open: false,
    loading: false,
    codeA: "",
    codeB: "",
    poeticNameA: "",
    poeticNameB: "",
  };
}

function createPosterState() {
  return {
    open: false,
  };
}

export const useUiStore = defineStore("ui", {
  state: () => ({
    loadingCount: 0,
    errorBanner: createErrorBanner(),
    toast: createToast(),
    compatConfirm: createCompatConfirmState(),
    posterSheet: createPosterState(),
  }),
  getters: {
    isLoading: (state) => state.loadingCount > 0,
  },
  actions: {
    startLoading() {
      this.loadingCount += 1;
    },
    stopLoading() {
      this.loadingCount = Math.max(0, this.loadingCount - 1);
    },
    showError(message, { status = null, code = "" } = {}) {
      this.errorBanner = {
        visible: true,
        message,
        status,
        code,
      };
    },
    clearError() {
      this.errorBanner = createErrorBanner();
    },
    showToast(message, type = "info") {
      this.toast = {
        visible: true,
        message,
        type,
      };

      if (toastTimer) {
        clearTimeout(toastTimer);
      }

      toastTimer = setTimeout(() => {
        this.hideToast();
      }, 2200);
    },
    hideToast() {
      this.toast = createToast();
    },
    openCompatConfirm(payload) {
      this.compatConfirm = {
        open: true,
        loading: false,
        codeA: payload.codeA || "",
        codeB: payload.codeB || "",
        poeticNameA: payload.poeticNameA || "",
        poeticNameB: payload.poeticNameB || "",
      };
    },
    setCompatConfirmLoading(loading) {
      this.compatConfirm.loading = loading;
    },
    closeCompatConfirm() {
      this.compatConfirm = createCompatConfirmState();
    },
    openPoster() {
      this.posterSheet.open = true;
    },
    closePoster() {
      this.posterSheet = createPosterState();
    },
  },
});
