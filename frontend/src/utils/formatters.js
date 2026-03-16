export function clampPercent(value, fallback = 0) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export function formatPercent(value, fallback = "—") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback;
  }

  return `${Math.round(Number(value))}%`;
}

export function formatDate(value, locale = "en") {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const localeMap = { ru: "ru-RU", zh: "zh-CN", en: "en-US" };
  return date.toLocaleDateString(localeMap[locale] || "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthYear(value, locale = "en") {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const localeMap = { ru: "ru-RU", zh: "zh-CN", en: "en-US" };
  return date.toLocaleDateString(localeMap[locale] || "en-US", {
    month: "short",
    year: "numeric",
  });
}

export function newlineToBr(value = "") {
  return String(value).replace(/\n/g, "<br>");
}
