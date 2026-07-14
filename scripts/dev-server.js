// Vercel CLI無しでもローカル確認できる簡易devサーバー (静的配信 + /api/analyze のみ再現)
require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const ROOT = path.join(__dirname, "..");
const PORT = process.env.PORT || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function serveStatic(reqPath, res) {
  let filePath = path.join(ROOT, reqPath === "/" ? "/index.html" : reqPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url);

  if (parsed.pathname === "/api/analyze") {
    req.body = await readBody(req);
    const handler = require("../api/analyze");
    const shimRes = {
      status(code) {
        res.statusCode = code;
        return this;
      },
      json(body) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(body));
      },
    };
    await handler(req, shimRes);
    return;
  }

  serveStatic(parsed.pathname, res);
});

server.listen(PORT, () => {
  console.log(`dev server: http://localhost:${PORT}`);
});
