import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../supabase.js", () => ({
  isSupabaseConfigured: true,
  supabase: { from: vi.fn() },
  getSupabaseStatus: vi.fn().mockReturnValue({ configured: true }),
}));

vi.mock("../openai.js", () => ({
  isOpenAiConfigured: false,
  analyzeWithOpenAi: vi.fn(),
  getOpenAiStatus: vi.fn().mockReturnValue({ configured: false }),
}));

import { app } from "../server.js";
import { supabase } from "../supabase.js";

function chain(result) {
  const c = {};
  for (const m of ["select", "insert", "update", "eq", "in", "order", "single"]) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return c;
}

beforeEach(() => vi.clearAllMocks());

// ── GET /api/packages/:id ─────────────────────────────────────────────────────

describe("GET /api/packages/:id", () => {
  it("gibt Paketdetails mit Materialien zurück", async () => {
    const pkg = {
      id: "p1",
      name: "Kapitel 1",
      created_at: "2026-01-01",
      subjects: { id: "s1", name: "Mathe" },
    };
    const materials = [
      {
        id: "m1",
        file_name: "aufgaben.pdf",
        summary: "Kurze Zusammenfassung",
        created_at: "2026-01-01",
        learning_activities: [{ id: "a1" }, { id: "a2" }],
      },
    ];

    supabase.from.mockImplementation((table) => {
      if (table === "learning_packages") return chain({ data: pkg, error: null });
      if (table === "learning_materials") return chain({ data: materials, error: null });
      return chain({ data: null, error: null });
    });

    const res = await request(app).get("/api/packages/p1");

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Kapitel 1");
    expect(res.body.subject.name).toBe("Mathe");
    expect(res.body.materials).toHaveLength(1);
    expect(res.body.materials[0].activity_count).toBe(2);
    expect(res.body.materials[0]).not.toHaveProperty("learning_activities");
  });

  it("gibt 404 zurück wenn Paket nicht existiert", async () => {
    supabase.from.mockReturnValue(chain({ data: null, error: { message: "Not found" } }));

    const res = await request(app).get("/api/packages/unbekannt");
    expect(res.status).toBe(404);
  });
});

// ── GET /api/packages/:id/activities ─────────────────────────────────────────

describe("GET /api/packages/:id/activities", () => {
  it("gibt Aktivitäten für ein Paket zurück", async () => {
    const activities = [
      { id: "a1", material_id: "m1", type: "multiple_choice", content: { question: "Was?" } },
      { id: "a2", material_id: "m1", type: "aufgabe", content: { question: "Erkläre..." } },
    ];

    supabase.from.mockImplementation((table) => {
      if (table === "learning_materials") return chain({ data: [{ id: "m1" }], error: null });
      if (table === "learning_activities") return chain({ data: activities, error: null });
      return chain({ data: null, error: null });
    });

    const res = await request(app).get("/api/packages/p1/activities");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].type).toBe("multiple_choice");
    expect(res.body[1].type).toBe("aufgabe");
  });

  it("gibt leeres Array zurück wenn keine Materialien vorhanden", async () => {
    supabase.from.mockReturnValue(chain({ data: [], error: null }));

    const res = await request(app).get("/api/packages/p1/activities");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── POST /api/packages/:id/analyze ───────────────────────────────────────────

describe("POST /api/packages/:id/analyze", () => {
  const validPdf = { name: "kapitel.pdf", type: "application/pdf", contentBase64: "dGVzdA==" };
  const materialRow = { id: "m-new", package_id: "p1", file_name: "kapitel.pdf" };

  it("gibt 400 zurück wenn files fehlt", async () => {
    const res = await request(app).post("/api/packages/p1/analyze").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Keine Dateien/);
  });

  it("verarbeitet eine Datei im Demo-Modus und speichert Material + Aktivitäten", async () => {
    supabase.from.mockImplementation((table) => {
      if (table === "learning_materials") return chain({ data: materialRow, error: null });
      if (table === "learning_activities") return chain({ data: null, error: null });
      return chain({ data: null, error: null });
    });

    const res = await request(app)
      .post("/api/packages/p1/analyze")
      .send({ files: [validPdf] });

    expect(res.status).toBe(200);
    expect(res.body.packageId).toBe("p1");
    expect(res.body.results).toHaveLength(1);

    const result = res.body.results[0];
    expect(result.status).toBe("completed");
    expect(result.fileName).toBe("kapitel.pdf");
    expect(result.materialId).toBe("m-new");
    expect(result.activityCount).toBeGreaterThan(0);

    // Stellt sicher dass Supabase-Schreibvorgänge stattgefunden haben
    expect(supabase.from).toHaveBeenCalledWith("learning_materials");
    expect(supabase.from).toHaveBeenCalledWith("learning_activities");
  });

  it("markiert nicht-unterstützte Dateitypen als failed ohne Supabase zu schreiben", async () => {
    supabase.from.mockReturnValue(chain({ data: null, error: null }));
    const txtFile = { name: "notizen.txt", type: "text/plain", contentBase64: "dGVzdA==" };

    const res = await request(app)
      .post("/api/packages/p1/analyze")
      .send({ files: [txtFile] });

    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("failed");
    // Kein Schreibvorgang in Supabase weil Validierung fehlgeschlagen
    expect(supabase.from).not.toHaveBeenCalledWith("learning_materials");
  });

  it("behandelt Supabase-Fehler beim Speichern als failed-Ergebnis", async () => {
    supabase.from.mockReturnValue(
      chain({ data: null, error: { message: "unique constraint violation" } }),
    );

    const res = await request(app)
      .post("/api/packages/p1/analyze")
      .send({ files: [validPdf] });

    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("failed");
    expect(res.body.results[0].error).toContain("unique constraint violation");
  });
});
