import { useCompatStore } from "../stores/useCompatStore";
import { useProfileStore } from "../stores/useProfileStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useUiStore } from "../stores/useUiStore";

export function useBootstrapRouting(router) {
  const sessionStore = useSessionStore();
  const profileStore = useProfileStore();
  const compatStore = useCompatStore();
  const uiStore = useUiStore();

  function resolveBootstrapRoute() {
    if (sessionStore.pendingReportId || compatStore.currentReportId) {
      const reportId = sessionStore.pendingReportId || compatStore.currentReportId;
      return { name: "compat-report", params: { reportId } };
    }

    if (profileStore.hasProfile) {
      return { name: "result" };
    }

    if (sessionStore.pendingDualIntent) {
      return { name: "profile" };
    }

    return { name: "landing" };
  }

  async function bootstrap() {
    const result = await sessionStore.bootstrap();

    if (result.preview && !profileStore.hasProfile) {
      uiStore.showToast("Browser preview mode is active.", "info");
    }

    if (sessionStore.pendingReportId) {
      compatStore.restorePendingReport({
        reportId: sessionStore.pendingReportId,
        codeA: sessionStore.pendingCodeA,
        codeB: sessionStore.pendingCodeB,
      });
    }

    const target = resolveBootstrapRoute();
    if (router.currentRoute.value.name !== target.name || JSON.stringify(router.currentRoute.value.params) !== JSON.stringify(target.params || {})) {
      await router.replace(target);
    }

    return result;
  }

  return {
    bootstrap,
    resolveBootstrapRoute,
  };
}
