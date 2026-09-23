const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");
const questionsFile = path.join(__dirname, "data", "questions.json");
const storageDir = process.env.DATA_DIR || path.join(__dirname, "storage");
const progressFile = path.join(storageDir, "progress.json");
const questions = JSON.parse(fs.readFileSync(questionsFile, "utf8"));

const emptyProgress = () => ({
  version: 1,
  stats: Object.fromEntries(questions.map(({ id }) => [id, { wrong: 0, attempts: 0, correct: 0 }])),
  sessions: { full: null, wrong: null },
  updatedAt: new Date().toISOString(),
});

fs.mkdirSync(storageDir, { recursive: true });

function readProgress() {
  try {
    const saved = JSON.parse(fs.readFileSync(progressFile, "utf8"));
    const base = emptyProgress();
    return {
      ...base,
      ...saved,
      stats: { ...base.stats, ...(saved.stats || {}) },
      sessions: { ...base.sessions, ...(saved.sessions || {}) },
    };
  } catch (error) {
    if (error.code !== "ENOENT") console.error("진행상태 읽기 실패:", error);
    return emptyProgress();
  }
}

function writeProgress(progress) {
  progress.updatedAt = new Date().toISOString();
  const temporary = `${progressFile}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(progress, null, 2), "utf8");
  fs.renameSync(temporary, progressFile);
}

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) request.destroy();
    });
    request.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); } catch (error) { reject(error); }
    });
    request.on("error", reject);
  });
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    if (request.method === "GET" && url.pathname === "/api/questions") {
      return json(response, 200, questions);
    }
    if (request.method === "GET" && url.pathname === "/api/progress") {
      return json(response, 200, readProgress());
    }
    if (request.method === "PUT" && url.pathname === "/api/progress") {
      const incoming = await readJson(request);
      if (!incoming || typeof incoming !== "object" || !incoming.stats || !incoming.sessions) {
        return json(response, 400, { error: "올바르지 않은 진행상태입니다." });
      }
      writeProgress(incoming);
      return json(response, 200, { ok: true, updatedAt: incoming.updatedAt });
    }
    if (request.method === "POST" && url.pathname === "/api/clear") {
      const fresh = emptyProgress();
      writeProgress(fresh);
      return json(response, 200, fresh);
    }
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json(response, 200, { ok: true, questions: questions.length });
    }

    if (request.method !== "GET") return json(response, 404, { error: "Not found" });
    const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const filePath = path.resolve(publicDir, requested);
    if (!filePath.startsWith(path.resolve(publicDir))) return json(response, 403, { error: "Forbidden" });
    fs.readFile(filePath, (error, data) => {
      if (error) return json(response, error.code === "ENOENT" ? 404 : 500, { error: "Not found" });
      response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
      response.end(data);
    });
  } catch (error) {
    console.error(error);
    json(response, 500, { error: "서버 처리 중 오류가 발생했습니다." });
  }
});

server.listen(port, "0.0.0.0", () => console.log(`AWS Security CBT: http://localhost:${port}`));
