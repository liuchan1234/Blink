const BLINK_CODE_INPUT_REGEX = /[^A-Z0-9-]/g;
const BLINK_CODE_REGEX = /^BLINK-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export function normalizeBlinkCodeInput(value = "") {
  const normalized = String(value).toUpperCase().replace(BLINK_CODE_INPUT_REGEX, "");

  if (!normalized.startsWith("BLINK") && normalized.length > 0) {
    return normalized;
  }

  if (normalized === "BLINK") {
    return "BLINK-";
  }

  if (normalized.startsWith("BLINK") && !normalized.startsWith("BLINK-")) {
    return `BLINK-${normalized.slice(5)}`.slice(0, 13);
  }

  return normalized.slice(0, 13);
}

export function normalizeBlinkCode(value = "") {
  return String(value).trim().toUpperCase();
}

export function isValidBlinkCode(value = "") {
  return BLINK_CODE_REGEX.test(normalizeBlinkCode(value));
}
