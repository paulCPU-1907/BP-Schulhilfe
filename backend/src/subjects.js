import { isSupabaseConfigured, supabase } from "./supabase.js";

export function registerSubjectRoutes(app) {
  app.get("/api/subjects", async (_req, res) => {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: "Supabase nicht konfiguriert." });
    }

    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, created_at, learning_packages(id)")
      .order("name");

    if (error) return res.status(500).json({ error: error.message });

    res.json(
      data.map((s) => ({
        id: s.id,
        name: s.name,
        created_at: s.created_at,
        package_count: s.learning_packages.length
      }))
    );
  });

  app.post("/api/subjects", async (req, res) => {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: "Supabase nicht konfiguriert." });
    }

    const name = req.body?.name?.trim();
    if (!name) return res.status(400).json({ error: "Name fehlt." });

    const { data, error } = await supabase
      .from("subjects")
      .insert({ name })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ ...data, package_count: 0 });
  });

  app.get("/api/subjects/:id/packages", async (req, res) => {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: "Supabase nicht konfiguriert." });
    }

    const { data, error } = await supabase
      .from("learning_packages")
      .select("id, name, created_at, learning_materials(id)")
      .eq("subject_id", req.params.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json(
      data.map((p) => ({
        id: p.id,
        name: p.name,
        created_at: p.created_at,
        material_count: p.learning_materials.length
      }))
    );
  });

  app.post("/api/packages", async (req, res) => {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: "Supabase nicht konfiguriert." });
    }

    const subject_id = req.body?.subject_id;
    const name = req.body?.name?.trim();

    if (!subject_id) return res.status(400).json({ error: "subject_id fehlt." });
    if (!name) return res.status(400).json({ error: "Name fehlt." });

    const { data, error } = await supabase
      .from("learning_packages")
      .insert({ subject_id, name })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ ...data, material_count: 0 });
  });
}
