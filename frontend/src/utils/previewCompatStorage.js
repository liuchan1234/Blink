const PREVIEW_COMPAT_KEY = "blink_preview_compat_reports";

function readReports() {
  try {
    const raw = localStorage.getItem(PREVIEW_COMPAT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeReports(reports) {
  try {
    localStorage.setItem(PREVIEW_COMPAT_KEY, JSON.stringify(reports));
  } catch {
    // ignore storage failures in preview mode
  }
}

export function savePreviewCompatReport(report) {
  const reports = readReports();
  const nextReports = [report, ...reports.filter((item) => item.report_id !== report.report_id)].slice(0, 20);
  writeReports(nextReports);
}

export function loadPreviewCompatReport(reportId) {
  return readReports().find((item) => item.report_id === reportId) || null;
}

export function listPreviewCompatHistory() {
  return readReports().map((item) => ({
    report_id: item.report_id,
    code_a: item.code_a,
    code_b: item.code_b,
    compat_score: item.report?.compat_score ?? null,
    lang: item.lang || "en",
    generated_at: item.report?.generated_at || item.generated_at || null,
  }));
}
