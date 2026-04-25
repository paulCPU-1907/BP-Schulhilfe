import { randomUUID } from "node:crypto";
import { validateFile, runAnalysis } from "./fileAnalysis.js";
import { isOpenAiConfigured } from "./openai.js";
import { isSupabaseConfigured, supabase } from "./supabase.js";

export function registerPackageRoutes(app) {
  app.get("/api/packages/:id", async (req, res) => {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: "Supabase nicht konfiguriert." });
    }

    const { data: pkg, error: pkgError } = await supabase
      .from("learning_packages")
      .select("*, subjects(id, name)")
      .eq("id", req.params.id)
      .single();

    if (pkgError) return res.status(404).json({ error: "Lernpaket nicht gefunden." });

    const { data: materials } = await supabase
      .from("learning_materials")
      .select("id, file_name, summary, created_at, learning_activities(id)")
      .eq("package_id", req.params.id)
      .order("created_at");

    res.json({
      id: pkg.id,
      name: pkg.name,
      subject: pkg.subjects,
      created_at: pkg.created_at,
      materials: (materials || []).map((m) => ({
        id: m.id,
        file_name: m.file_name,
        summary: m.summary,
        created_at: m.created_at,
        activity_count: m.learning_activities.length
      }))
    });
  });

  app.post("/api/packages/:id/analyze", async (req, res) => {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: "Supabase nicht konfiguriert." });
    }

    const packageId = req.params.id;
    const requestId = randomUUID();

    try {
      const files = req.body?.files;

      console.log(`[${requestId}] /api/packages/${packageId}/analyze gestartet`, {
        fileCount: Array.isArray(files) ? files.length : 0
      });

      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: "Keine Dateien im Request gefunden." });
      }

      const results = await Promise.all(
        files.map((file) => analyzeFileForPackage(file, packageId, requestId))
      );

      console.log(`[${requestId}] Paket-Analyse abgeschlossen`, {
        packageId,
        completed: results.filter((r) => r.status === "completed").length,
        failed: results.filter((r) => r.status === "failed").length
      });

      res.json({ requestId, packageId, results });
    } catch (error) {
      console.error(`[${requestId}] Unerwarteter Fehler`, error);
      res.status(500).json({ error: "Analyse konnte nicht abgeschlossen werden." });
    }
  });

  app.get("/api/packages/:id/activities", async (req, res) => {
    if (!isSupabaseConfigured) {
      return res.status(503).json({ error: "Supabase nicht konfiguriert." });
    }

    const { data: materials, error: matError } = await supabase
      .from("learning_materials")
      .select("id")
      .eq("package_id", req.params.id);

    if (matError) return res.status(500).json({ error: matError.message });
    if (!materials || materials.length === 0) return res.json([]);

    const materialIds = materials.map((m) => m.id);

    const { data: activities, error: actError } = await supabase
      .from("learning_activities")
      .select("id, material_id, type, content")
      .in("material_id", materialIds);

    if (actError) return res.status(500).json({ error: actError.message });

    res.json(activities || []);
  });
}

async function analyzeFileForPackage(file, packageId, requestId) {
  const fileName = file?.name || "Datei";

  try {
    validateFile(file);

    console.log(`[${requestId}] Analyse startet`, {
      fileName,
      provider: isOpenAiConfigured ? "openai" : "demo"
    });

    const aiResult = await runAnalysis(file);

    const { data: material, error: materialError } = await supabase
      .from("learning_materials")
      .insert({
        package_id: packageId,
        file_name: fileName,
        ocr_text: aiResult.ocrText,
        summary: aiResult.summary
      })
      .select()
      .single();

    if (materialError) throw new Error(materialError.message);

    const activityRows = [
      ...aiResult.multiple_choice_questions.map((q) => ({
        material_id: material.id,
        type: "multiple_choice",
        content: q
      })),
      ...aiResult.aufgaben.map((q) => ({
        material_id: material.id,
        type: "aufgabe",
        content: q
      }))
    ];

    if (activityRows.length > 0) {
      const { error: actError } = await supabase
        .from("learning_activities")
        .insert(activityRows);
      if (actError) throw new Error(actError.message);
    }

    console.log(`[${requestId}] Material gespeichert`, {
      fileName,
      materialId: material.id,
      activityCount: activityRows.length
    });

    return {
      status: "completed",
      fileName,
      materialId: material.id,
      summary: aiResult.summary,
      activityCount: activityRows.length
    };
  } catch (error) {
    console.error(`[${requestId}] Datei fehlgeschlagen`, { fileName, error: error.message });
    return { status: "failed", fileName, error: error.message };
  }
}
