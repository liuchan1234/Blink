let currentBackHandler = null;

function getWebApp() {
  return window.Telegram?.WebApp || null;
}

function applyViewportHeight() {
  const webApp = getWebApp();
  const viewportHeight = webApp?.viewportStableHeight || window.innerHeight;
  document.documentElement.style.setProperty("--tg-viewport-height", `${viewportHeight}px`);
}

export function useTelegramWebApp() {
  const webApp = getWebApp();
  const isTelegram = Boolean(webApp);
  const isBrowserPreview = !isTelegram;

  function ready() {
    webApp?.ready?.();
    applyViewportHeight();
  }

  function expand() {
    webApp?.expand?.();
    applyViewportHeight();
  }

  function initViewportListener() {
    applyViewportHeight();

    if (webApp?.onEvent) {
      webApp.onEvent("viewportChanged", applyViewportHeight);
      return () => webApp.offEvent?.("viewportChanged", applyViewportHeight);
    }

    const onResize = () => applyViewportHeight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }

  function bindBackButton(handler) {
    const backButton = webApp?.BackButton;
    if (!backButton) return () => {};

    if (currentBackHandler) {
      backButton.offClick?.(currentBackHandler);
    }

    currentBackHandler = handler;
    backButton.onClick?.(handler);

    return () => {
      backButton.offClick?.(handler);
      if (currentBackHandler === handler) {
        currentBackHandler = null;
      }
    };
  }

  function setBackButtonVisible(visible) {
    const backButton = webApp?.BackButton;
    if (!backButton) return;

    if (visible) backButton.show?.();
    else backButton.hide?.();
  }

  function haptic(style = "light") {
    webApp?.HapticFeedback?.impactOccurred?.(style);
  }

  function notify(type = "success") {
    webApp?.HapticFeedback?.notificationOccurred?.(type);
  }

  function getInitData() {
    return webApp?.initData || "";
  }

  function getUserId() {
    return webApp?.initDataUnsafe?.user?.id || null;
  }

  function getLanguageCode() {
    return webApp?.initDataUnsafe?.user?.language_code || null;
  }

  function getStartParam() {
    return webApp?.initDataUnsafe?.start_param || "";
  }

  function openInvoice(invoiceLink) {
    return new Promise((resolve) => {
      if (!webApp?.openInvoice) {
        resolve("preview");
        return;
      }

      webApp.openInvoice(invoiceLink, (status) => resolve(status || "unknown"));
    });
  }

  function share(text, url) {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url || "")}&text=${encodeURIComponent(text || "")}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  return {
    webApp,
    isTelegram,
    isBrowserPreview,
    ready,
    expand,
    initViewportListener,
    bindBackButton,
    setBackButtonVisible,
    haptic,
    notify,
    getInitData,
    getUserId,
    getLanguageCode,
    getStartParam,
    openInvoice,
    share,
    applyViewportHeight,
  };
}
