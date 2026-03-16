export function useCompatPolling({
  fetchStatus,
  onPending = () => {},
  onDone = () => {},
  onFailed = () => {},
  onTimeout = () => {},
  onError = () => {},
  intervalMs = 3000,
  maxAttempts = 40,
}) {
  let timer = null;
  let attempts = 0;
  let activeReportId = null;
  let running = false;

  async function tick() {
    if (!activeReportId) return;

    attempts += 1;
    if (attempts > maxAttempts) {
      stop();
      onTimeout(activeReportId);
      return;
    }

    try {
      const data = await fetchStatus(activeReportId);

      if (data?.status === "done") {
        stop();
        onDone(data, activeReportId);
        return;
      }

      if (data?.status === "failed") {
        stop();
        onFailed(data, activeReportId);
        return;
      }

      onPending(data, activeReportId);
    } catch (error) {
      onError(error, activeReportId);
    }
  }

  async function start(reportId) {
    stop();
    activeReportId = reportId;
    attempts = 0;
    running = true;

    await tick();

    if (!running || !activeReportId) {
      return;
    }

    timer = window.setInterval(() => {
      void tick();
    }, intervalMs);
  }

  function stop() {
    running = false;
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function getState() {
    return {
      running,
      attempts,
      reportId: activeReportId,
    };
  }

  return {
    start,
    stop,
    getState,
  };
}
