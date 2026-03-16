import fs from "node:fs/promises";
import path from "node:path";

export const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Telegram-Init-Data",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

export function text(res, statusCode, content, type = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Telegram-Init-Data",
    "Cache-Control": "no-store"
  });
  res.end(content);
}

export function badRequest(res, message = "bad_request", extra = {}) {
  return json(res, 400, { error: message, ...extra });
}

export function notFound(res, message = "not_found", extra = {}) {
  return json(res, 404, { error: message, ...extra });
}

export function internalError(res, err) {
  const msg = err instanceof Error ? err.message : "internal_error";
  return json(res, 500, { error: "internal_error", message: msg });
}

export async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function parseTelegramUserId(initDataRaw) {
  if (!initDataRaw || typeof initDataRaw !== "string") return null;
  const params = new URLSearchParams(initDataRaw);
  const userRaw = params.get("user");
  if (!userRaw) return null;
  try {
    const user = JSON.parse(decodeURIComponent(userRaw));
    if (user && (typeof user.id === "number" || typeof user.id === "string")) {
      return String(user.id);
    }
  } catch {
    return null;
  }
  return null;
}

export function getRequestUserId(req) {
  const headerUserId = parseTelegramUserId(req.headers["x-telegram-init-data"]);
  if (headerUserId) return headerUserId;
  return "local_preview_user";
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function normalizeBlinkCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

export function generateBlinkCode(existingCodes = new Set()) {
  let attempts = 0;
  while (attempts < 20000) {
    attempts += 1;
    let suffix = "";
    for (let i = 0; i < 6; i += 1) suffix += CODE_CHARS[randInt(0, CODE_CHARS.length - 1)];
    const code = `BLINK-${suffix}`;
    if (!existingCodes.has(code)) return code;
  }
  throw new Error("unable_to_generate_unique_code");
}

export function nowIso() {
  return new Date().toISOString();
}

export async function fileExists(filepath) {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

export function safeJoin(baseDir, requestedPath) {
  const target = path.resolve(baseDir, `.${requestedPath}`);
  if (!target.startsWith(path.resolve(baseDir))) return null;
  return target;
}

export function contentTypeByExt(filepath) {
  if (filepath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filepath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filepath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filepath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filepath.endsWith(".svg")) return "image/svg+xml";
  if (filepath.endsWith(".png")) return "image/png";
  if (filepath.endsWith(".jpg") || filepath.endsWith(".jpeg")) return "image/jpeg";
  if (filepath.endsWith(".ico")) return "image/x-icon";
  return "application/octet-stream";
}
