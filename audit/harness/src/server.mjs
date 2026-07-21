import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webp": "image/webp",
});

function safePath(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const relative = decoded.replace(/^\/+/, "");
  const candidate = path.resolve(root, relative || "index.html");
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return null;
  return candidate;
}

async function resolveFile(root, requestPath) {
  let candidate = safePath(root, requestPath);
  if (!candidate) return null;
  try {
    const info = await stat(candidate);
    if (info.isDirectory()) candidate = path.join(candidate, "index.html");
    const fileInfo = await stat(candidate);
    return fileInfo.isFile() ? { path: candidate, size: fileInfo.size } : null;
  } catch {
    return null;
  }
}

export async function startStaticServer(root) {
  const absoluteRoot = path.resolve(root);
  const server = http.createServer(async (request, response) => {
    if (!request.url || !["GET", "HEAD"].includes(request.method || "")) {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    if (request.url.split("?")[0] === "/favicon.ico") {
      response.writeHead(204, { "Cache-Control": "no-store", "X-MMS-Audit-Fixture": path.basename(absoluteRoot) });
      response.end();
      return;
    }
    const file = await resolveFile(absoluteRoot, request.url);
    if (!file) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      response.end("Not found\n");
      return;
    }
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(file.path).toLowerCase()] || "application/octet-stream",
      "Content-Length": file.size,
      "Cache-Control": "no-store",
      "X-MMS-Audit-Fixture": path.basename(absoluteRoot),
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(file.path).pipe(response);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("fixture server did not expose a TCP port");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}
