import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

// vi.mock wird von Vitest automatisch an den Dateianfang gehoistet,
// sodass die Mocks aktiv sind bevor server.js importiert wird.
vi.mock("../supabase.js", () => ({
  isSupabaseConfigured: false,
  supabase: null,
  getSupabaseStatus: vi.fn().mockReturnValue({
    configured: false,
    urlConfigured: false,
    keyConfigured: false,
    keyType: null,
  }),
}));

vi.mock("../openai.js", () => ({
  isOpenAiConfigured: false,
  analyzeWithOpenAi: vi.fn(),
  getOpenAiStatus: vi.fn().mockReturnValue({ configured: false, model: "gpt-4o-mini" }),
}));

import { app } from "../server.js";

beforeEach(() => vi.clearAllMocks());

// ── /health ───────────────────────────────────────────────────────────────────

describe("GET /health", () => {
  it("antwortet mit 200 und status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("bp-backend");
  });
});

describe("GET /api/health", () => {
  it("gibt openai- und supabase-Zustand zurück", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.openai).toBeDefined();
    expect(res.body.supabase).toBeDefined();
  });
});

describe("GET /api/openai/health", () => {
  it("antwortet mit 503 wenn OpenAI nicht konfiguriert ist", async () => {
    const res = await request(app).get("/api/openai/health");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("not_configured");
  });
});

// ── POST /api/analyze ─────────────────────────────────────────────────────────

describe("POST /api/analyze", () => {
  const validPdf = {
    name: "test.pdf",
    type: "application/pdf",
    contentBase64: "dGVzdA==",
  };

  it("gibt 400 zurück wenn files fehlt", async () => {
    const res = await request(app).post("/api/analyze").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Keine Dateien/);
  });

  it("gibt 400 zurück wenn files ein leeres Array ist", async () => {
    const res = await request(app).post("/api/analyze").send({ files: [] });
    expect(res.status).toBe(400);
  });

  it("verarbeitet eine PDF-Datei im Demo-Modus", async () => {
    const res = await request(app).post("/api/analyze").send({ files: [validPdf] });
    expect(res.status).toBe(200);
    expect(res.body.requestId).toBeDefined();
    expect(res.body.results).toHaveLength(1);

    const result = res.body.results[0];
    expect(result.status).toBe("completed");
    expect(result.provider).toBe("demo");
    expect(result.ocrText).toBeTruthy();
    expect(result.summary).toBeTruthy();
    expect(result.tasks).toBeInstanceOf(Array);
  });

  it("markiert nicht-unterstützte Dateitypen als failed", async () => {
    const textFile = { name: "notizen.txt", type: "text/plain", contentBase64: "dGVzdA==" };
    const res = await request(app).post("/api/analyze").send({ files: [textFile] });

    expect(res.status).toBe(200);
    const result = res.body.results[0];
    expect(result.status).toBe("failed");
    expect(result.error).toBeTruthy();
  });

  it("verarbeitet mehrere Dateien parallel – Mix aus completed und failed", async () => {
    const files = [
      validPdf,
      { name: "foto.jpg", type: "image/jpeg", contentBase64: "dGVzdA==" },
      { name: "tabelle.csv", type: "text/csv", contentBase64: "dGVzdA==" },
    ];
    const res = await request(app).post("/api/analyze").send({ files });

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(3);

    const completed = res.body.results.filter((r) => r.status === "completed");
    const failed = res.body.results.filter((r) => r.status === "failed");
    expect(completed).toHaveLength(2);
    expect(failed).toHaveLength(1);
  });

  it("gibt requestId im Antwortobjekt zurück", async () => {
    const res = await request(app).post("/api/analyze").send({ files: [validPdf] });
    expect(typeof res.body.requestId).toBe("string");
    expect(res.body.requestId).toHaveLength(36); // UUID v4
  });
});
