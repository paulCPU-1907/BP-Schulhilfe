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
  getOpenAiStatus: vi.fn().mockReturnValue({ configured: false, model: "gpt-4o-mini" }),
}));

import { app } from "../server.js";
import { supabase } from "../supabase.js";

// Baut einen chainbaren Supabase-Mock: jede Methode gibt die Chain zurück,
// die Chain selbst ist thenable – damit funktioniert await an jeder Stelle.
function chain(result) {
  const c = {};
  for (const m of ["select", "insert", "update", "eq", "in", "order", "single"]) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return c;
}

beforeEach(() => vi.clearAllMocks());

// ── GET /api/subjects ─────────────────────────────────────────────────────────

describe("GET /api/subjects", () => {
  it("gibt eine Fächerliste mit package_count zurück", async () => {
    supabase.from.mockReturnValue(
      chain({
        data: [
          {
            id: "s1",
            name: "Mathematik",
            created_at: "2026-01-01",
            learning_packages: [{ id: "p1" }, { id: "p2" }],
          },
        ],
        error: null,
      }),
    );

    const res = await request(app).get("/api/subjects");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Mathematik");
    expect(res.body[0].package_count).toBe(2);
    expect(res.body[0]).not.toHaveProperty("learning_packages");
  });

  it("gibt leeres Array zurück wenn keine Fächer vorhanden", async () => {
    supabase.from.mockReturnValue(chain({ data: [], error: null }));

    const res = await request(app).get("/api/subjects");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("gibt 500 bei Supabase-Fehler zurück", async () => {
    supabase.from.mockReturnValue(chain({ data: null, error: { message: "DB nicht erreichbar" } }));

    const res = await request(app).get("/api/subjects");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("DB nicht erreichbar");
  });
});

// ── POST /api/subjects ────────────────────────────────────────────────────────

describe("POST /api/subjects", () => {
  it("legt ein Fach an und gibt es mit package_count:0 zurück", async () => {
    const newSubject = { id: "s2", name: "Geschichte", created_at: "2026-01-01" };
    supabase.from.mockReturnValue(chain({ data: newSubject, error: null }));

    const res = await request(app)
      .post("/api/subjects")
      .send({ name: "Geschichte" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Geschichte");
    expect(res.body.package_count).toBe(0);
  });

  it("gibt 400 zurück wenn name fehlt", async () => {
    const res = await request(app).post("/api/subjects").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Name fehlt/);
  });

  it("ignoriert Leerzeichen im Namen (trimmt)", async () => {
    const newSubject = { id: "s3", name: "Physik", created_at: "2026-01-01" };
    supabase.from.mockReturnValue(chain({ data: newSubject, error: null }));

    const res = await request(app)
      .post("/api/subjects")
      .send({ name: "  Physik  " });

    expect(res.status).toBe(201);
    // Der eigentliche Datenbankaufruf soll mit getrimtem Namen erfolgen
    expect(supabase.from).toHaveBeenCalledWith("subjects");
  });

  it("gibt 500 bei Supabase-Fehler zurück", async () => {
    supabase.from.mockReturnValue(chain({ data: null, error: { message: "Insert failed" } }));

    const res = await request(app).post("/api/subjects").send({ name: "Chemie" });
    expect(res.status).toBe(500);
  });
});

// ── GET /api/subjects/:id/packages ────────────────────────────────────────────

describe("GET /api/subjects/:id/packages", () => {
  it("gibt Pakete für ein Fach zurück", async () => {
    supabase.from.mockReturnValue(
      chain({
        data: [
          {
            id: "p1",
            name: "Kapitel 1",
            created_at: "2026-01-01",
            learning_materials: [{ id: "m1" }],
          },
          {
            id: "p2",
            name: "Kapitel 2",
            created_at: "2026-01-02",
            learning_materials: [],
          },
        ],
        error: null,
      }),
    );

    const res = await request(app).get("/api/subjects/s1/packages");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].material_count).toBe(1);
    expect(res.body[1].material_count).toBe(0);
    expect(res.body[0]).not.toHaveProperty("learning_materials");
  });

  it("gibt 500 bei Datenbankfehler zurück", async () => {
    supabase.from.mockReturnValue(chain({ data: null, error: { message: "Timeout" } }));

    const res = await request(app).get("/api/subjects/x/packages");
    expect(res.status).toBe(500);
  });
});

// ── POST /api/packages ────────────────────────────────────────────────────────

describe("POST /api/packages", () => {
  it("legt ein Lernpaket an", async () => {
    const newPkg = { id: "p3", subject_id: "s1", name: "Übungen", created_at: "2026-01-01" };
    supabase.from.mockReturnValue(chain({ data: newPkg, error: null }));

    const res = await request(app)
      .post("/api/packages")
      .send({ subject_id: "s1", name: "Übungen" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Übungen");
    expect(res.body.material_count).toBe(0);
  });

  it("gibt 400 zurück wenn subject_id fehlt", async () => {
    const res = await request(app).post("/api/packages").send({ name: "Test" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/subject_id/);
  });

  it("gibt 400 zurück wenn name fehlt", async () => {
    const res = await request(app).post("/api/packages").send({ subject_id: "s1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Name fehlt/);
  });
});
