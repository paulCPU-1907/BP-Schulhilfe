import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const path = url.pathname.replace(/.*\/packages/, "") || "/";

  // ── POST /packages ─────────────────────────────────────────────────────────
  if (path === "/" || path === "") {
    if (req.method === "POST") {
      const body = await req.json();
      const subject_id = body?.subject_id;
      const name = body?.name?.trim();

      if (!subject_id) return json({ error: "subject_id fehlt." }, 400);
      if (!name) return json({ error: "Name fehlt." }, 400);

      const { data, error } = await supabase
        .from("learning_packages")
        .insert({ subject_id, name })
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);

      return json({ ...data, material_count: 0 }, 201);
    }
    return json({ error: "Method not allowed" }, 405);
  }

  // Routes that require a package ID: /<id> or /<id>/analyze or /<id>/activities
  const idMatch = path.match(/^\/([^/]+)(\/([^/]+))?$/);
  if (!idMatch) return json({ error: "Not found" }, 404);

  const packageId = idMatch[1];
  const subPath = idMatch[3]; // "analyze", "activities", or undefined

  // ── GET /packages/:id ─────────────────────────────────────────────────────
  if (!subPath && req.method === "GET") {
    const { data: pkg, error: pkgError } = await supabase
      .from("learning_packages")
      .select("*, subjects(id, name)")
      .eq("id", packageId)
      .single();

    if (pkgError) return json({ error: "Lernpaket nicht gefunden." }, 404);

    const { data: materials } = await supabase
      .from("learning_materials")
      .select("id, file_name, summary, created_at, learning_activities(id)")
      .eq("package_id", packageId)
      .order("created_at");

    return json({
      id: pkg.id,
      name: pkg.name,
      subject: pkg.subjects,
      created_at: pkg.created_at,
      materials: (materials || []).map((m) => ({
        id: m.id,
        file_name: m.file_name,
        summary: m.summary,
        created_at: m.created_at,
        activity_count: m.learning_activities.length,
      })),
    });
  }

  // ── POST /packages/:id/analyze ─────────────────────────────────────────────
  if (subPath === "analyze" && req.method === "POST") {
    const requestId = crypto.randomUUID();
    const body = await req.json();
    const files = body?.files;

    if (!Array.isArray(files) || files.length === 0) {
      return json({ error: "Keine Dateien im Request gefunden." }, 400);
    }

    const results = await Promise.all(
      files.map((file) => analyzeFileForPackage(file, packageId, requestId, supabase)),
    );

    return json({ requestId, packageId, results });
  }

  // ── GET /packages/:id/activities ───────────────────────────────────────────
  if (subPath === "activities" && req.method === "GET") {
    const { data: materials, error: matError } = await supabase
      .from("learning_materials")
      .select("id")
      .eq("package_id", packageId);

    if (matError) return json({ error: matError.message }, 500);
    if (!materials || materials.length === 0) return json([]);

    const materialIds = materials.map((m: { id: string }) => m.id);

    const { data: activities, error: actError } = await supabase
      .from("learning_activities")
      .select("id, material_id, type, content")
      .in("material_id", materialIds);

    if (actError) return json({ error: actError.message }, 500);

    return json(activities || []);
  }

  return json({ error: "Not found" }, 404);
});

// ── OpenAI analysis ──────────────────────────────────────────────────────────

interface FilePayload {
  name: string;
  type: string;
  size?: number;
  contentBase64: string;
}

async function analyzeFileForPackage(
  file: FilePayload,
  packageId: string,
  requestId: string,
  supabase: SupabaseClient,
) {
  const fileName = file?.name || "Datei";

  try {
    validateFile(file);

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    const aiResult = openAiKey
      ? await analyzeWithOpenAi(file, openAiKey)
      : demoAnalysis(file);

    const { data: material, error: materialError } = await supabase
      .from("learning_materials")
      .insert({
        package_id: packageId,
        file_name: fileName,
        ocr_text: aiResult.ocrText,
        summary: aiResult.summary,
      })
      .select()
      .single();

    if (materialError) throw new Error(materialError.message);

    const activityRows = [
      ...aiResult.multiple_choice_questions.map((q: unknown) => ({
        material_id: material.id,
        type: "multiple_choice",
        content: q,
      })),
      ...aiResult.aufgaben.map((q: unknown) => ({
        material_id: material.id,
        type: "aufgabe",
        content: q,
      })),
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
      activityCount: activityRows.length,
    });

    return {
      status: "completed",
      fileName,
      materialId: material.id,
      summary: aiResult.summary,
      activityCount: activityRows.length,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Datei fehlgeschlagen`, { fileName, error: msg });
    return { status: "failed", fileName, error: msg };
  }
}

function validateFile(file: FilePayload) {
  if (!file || typeof file !== "object") throw new Error("Dateiobjekt fehlt.");
  if (!file.name) throw new Error("Dateiname fehlt.");
  if (!file.contentBase64) throw new Error("Dateiinhalt fehlt.");
  const type = file.type || "";
  const lower = (file.name || "").toLowerCase();
  const supported =
    type === "application/pdf" ||
    type.startsWith("image/") ||
    lower.endsWith(".pdf") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp");
  if (!supported) throw new Error("Nur PDFs und Bilder werden unterstuetzt.");
}

async function analyzeWithOpenAi(file: FilePayload, apiKey: string) {
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const dataUrl = `data:${file.type || "application/octet-stream"};base64,${file.contentBase64}`;
  const isImage = (file.type || "").startsWith("image/");
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  const fileContent: unknown[] = [{ type: "input_text", text: `Analysiere diese Datei: ${file.name}` }];
  if (isImage) {
    fileContent.push({ type: "input_image", image_url: dataUrl });
  } else if (isPdf) {
    fileContent.push({ type: "input_file", filename: file.name, file_data: dataUrl });
  } else {
    throw new Error("Nur PDFs und Bilder werden fuer OpenAI OCR unterstuetzt.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "Du bist ein OCR- und Lernassistent fuer Schueler.",
                "Extrahiere zuerst den erkennbaren Text aus der Datei.",
                "Erstelle danach eine kurze Zusammenfassung, allgemeine Lernaufgaben,",
                "Multiple-Choice-Fragen mit je vier Antwortoptionen sowie offene Aufgaben mit Musterloesungen.",
                "Alle Texte auf Deutsch. Antworte ausschliesslich als JSON passend zum Schema.",
              ].join(" "),
            },
          ],
        },
        { role: "user", content: fileContent },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "learning_material_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              ocrText: { type: "string" },
              summary: { type: "string" },
              tasks: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
              multiple_choice_questions: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    question: { type: "string" },
                    options: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
                    correct_index: { type: "integer" },
                    explanation: { type: "string" },
                  },
                  required: ["question", "options", "correct_index", "explanation"],
                },
              },
              aufgaben: {
                type: "array",
                minItems: 2,
                maxItems: 4,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    question: { type: "string" },
                    model_answer: { type: "string" },
                  },
                  required: ["question", "model_answer"],
                },
              },
            },
            required: ["ocrText", "summary", "tasks", "multiple_choice_questions", "aufgaben"],
          },
        },
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "OpenAI Analyse fehlgeschlagen.");

  const outputText =
    data.output_text ||
    data.output
      ?.flatMap((item: { content?: unknown[] }) => item.content || [])
      .find((c: { type: string }) => c.type === "output_text")
      ?.text;

  if (!outputText) throw new Error("OpenAI hat kein auswertbares Ergebnis geliefert.");
  return JSON.parse(outputText);
}

function demoAnalysis(file: FilePayload) {
  return {
    ocrText: `Simulierter OCR-Text aus ${file.name}. In der echten App steht hier der erkannte Text.`,
    summary: `Demo-Zusammenfassung fuer ${file.name}: Das Dokument wurde erkannt und verarbeitet.`,
    tasks: [
      "Markiere die drei wichtigsten Begriffe im Material.",
      "Schreibe eine eigene Zusammenfassung in fuenf Saetzen.",
      "Erstelle zwei Pruefungsfragen und beantworte sie.",
    ],
    multiple_choice_questions: [
      {
        question: "Was ist das Hauptziel beim aktiven Lernen?",
        options: [
          "Den Text moeglichst schnell lesen",
          "Den Inhalt verstehen und verarbeiten",
          "Alle Woerter auswendig lernen",
          "Das Dokument speichern",
        ],
        correct_index: 1,
        explanation: "Aktives Lernen zielt darauf ab, Inhalte wirklich zu verstehen.",
      },
      {
        question: "Welche Methode hilft am meisten beim langfristigen Behalten?",
        options: ["Einmaliges Lesen", "Passives Zuhoeren", "Aktive Wiederholung", "Den Text markieren"],
        correct_index: 2,
        explanation: "Active Recall ist wissenschaftlich die effektivste Lernmethode.",
      },
      {
        question: "Was macht man sinnvollerweise direkt nach dem ersten Lesen?",
        options: [
          "Sofort den naechsten Text lesen",
          "Das Gelernte in eigenen Worten zusammenfassen",
          "Den Text ausdrucken",
          "Nichts – Pause machen",
        ],
        correct_index: 1,
        explanation: "Das Zusammenfassen in eigenen Worten zeigt und festigt das echte Verstaendnis.",
      },
    ],
    aufgaben: [
      {
        question: "Erklaere in zwei bis drei Saetzen, worum es in diesem Dokument geht.",
        model_answer:
          "Das Dokument behandelt grundlegende Lernstrategien. Besonders wichtig sind Wiederholung und Zusammenfassen. Wer versteht statt auswendig zu lernen, behaelt mehr.",
      },
      {
        question: "Nenne zwei wichtige Erkenntnisse aus diesem Material.",
        model_answer:
          "1. Verstehen schlaegt Auswendiglernen. 2. Aktive Wiederholung ist effektiver als passives Wiederlesen.",
      },
    ],
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
