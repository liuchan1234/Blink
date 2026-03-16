import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonStore } from "./store.js";
import { createApiRouter } from "./router.js";
import { contentTypeByExt, internalError, safeJoin, text } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PROJECT_DIR = path.resolve(ROOT_DIR, "..");
const FRONTEND_DIR = path.join(PROJECT_DIR, "frontend");
const DB_FILE = path.join(ROOT_DIR, "data", "db.json");

const config = {
  PORT: Number(process.env.PORT || 8787),
  HOST: process.env.HOST || "0.0.0.0",
  FREE_SUBMIT_LIMIT: Number(process.env.FREE_SUBMIT_LIMIT || 2),
  AUTOCOMPLETE_MS: Number(process.env.AUTOCOMPLETE_MS || 4500)
};

const store = new JsonStore(DB_FILE);
await store.init();
const routeApi = createApiRouter({ store, config });

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const fullPath = safeJoin(FRONTEND_DIR, pathname);
  if (!fullPath) return text(res, 404, "Not Found");

  try {
    const body = await fs.readFile(fullPath);
    res.writeHead(200, {
      "Content-Type": contentTypeByExt(fullPath),
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store"
    });
    res.end(body);
  } catch {
    text(res, 404, "Not Found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${config.PORT}`;
    const url = new URL(req.url || "/", `http://${host}`);

    if (url.pathname.startsWith("/api/")) {
      await routeApi(req, res, url);
      return;
    }

    await serveStatic(req, res, url);
  } catch (err) {
    internalError(res, err);
  }
});

server.listen(config.PORT, config.HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[blink-backend] running on http://${config.HOST}:${config.PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[blink-backend] serving frontend from ${FRONTEND_DIR}`);
});
