// 留空时使用相对路径，请求会走 Vite 代理到后端；Telegram 隧道访问时必需
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export function getTelegramInitData() {
  return window.Telegram?.WebApp?.initData || "";
}

function buildHeaders(body) {
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const initData = getTelegramInitData();
  if (initData) {
    headers["X-Telegram-Init-Data"] = initData;
  }

  return headers;
}

export async function apiCall(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: buildHeaders(body),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response
    .json()
    .catch(async () => ({ detail: await response.text().catch(() => "") }));

  if (!response.ok) {
    const error = new Error(data.detail || data.error || `Request failed: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
