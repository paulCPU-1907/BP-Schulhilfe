import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { analyzeWithOpenAi, getOpenAiStatus, isOpenAiConfigured } from "./openai.js";
import { getSupabaseStatus, isSupabaseConfigured, supabase } from "./supabase.js";

const app = express();
const port = process.env.PORT || 3000;
const maxPayloadSize = "25mb";

app.use(cors());
app.use(express.json({ limit: maxPayloadSize }));

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "bp-backend"
  });
});

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "bp-backend",
    openai: getOpenAiStatus(),
    supabase: getSupabaseStatus()
  });
});

app.get("/api/message", (_request, response) => {
  response.json({
    message: "Hallo vom Backend Microservice!"
  });
});

app.get("/api/supabase/health", async (_request, response) => {
  if (!isSupabaseConfigured) {
    return response.status(503).json({
      status: "not_configured",
      supabase: getSupabaseStatus()
    });
  }

  const { error } = await supabase
    .from("analysis_results")
    .select("id", { count: "exact", head: true });

  if (error) {
    return response.status(500).json({
      status: "error",
      error: error.message,
      supabase: getSupabaseStatus()
    });
  }

  response.json({
    status: "ok",
    supabase: getSupabaseStatus()
  });
});

app.get("/api/openai/health", (_request, response) => {
  response.status(isOpenAiConfigured ? 200 : 503).json({
    status: isOpenAiConfigured ? "ok" : "not_configured",
    openai: getOpenAiStatus()
  });
});

app.post("/api/analyze", async (request, response) => {
  const requestId = randomUUID();
  const startedAt = Date.now();

  try {
    const files = request.body?.files;

    console.log(`[${requestId}] /api/analyze gestartet`, {
      fileCount: Array.isArray(files) ? files.length : 0
    });

    if (!Array.isArray(files) || files.length === 0) {
      return response.status(400).json({
        error: "Keine Dateien im Request gefunden. Erwartet wird { files: [...] }."
      });
    }

    const results = await Promise.all(
      files.map((file, index) => analyzeFile(file, index, requestId))
    );

    console.log(`[${requestId}] /api/analyze beendet`, {
      durationMs: Date.now() - startedAt,
      completed: results.filter((result) => result.status === "completed").length,
      failed: results.filter((result) => result.status === "failed").length
    });

    await persistAnalysisResults(requestId, results);

    response.json({
      requestId,
      results
    });
  } catch (error) {
    console.error(`[${requestId}] /api/analyze unerwarteter Fehler`, error);

    response.status(500).json({
      requestId,
      error: "Analyse konnte nicht abgeschlossen werden."
    });
  }
});

async function analyzeFile(file, index, requestId) {
  const fileName = file?.name || `Datei ${index + 1}`;

  try {
    validateFile(file);

    console.log(`[${requestId}] OCR startet`, {
      fileName,
      type: file.type,
      size: file.size
    });

    const aiResult = isOpenAiConfigured
      ? await analyzeWithOpenAi(file)
      : await runDemoAnalysis(file);

    console.log(`[${requestId}] OCR fertig`, {
      fileName,
      textLength: aiResult.ocrText.length,
      provider: isOpenAiConfigured ? "openai" : "demo"
    });

    console.log(`[${requestId}] KI fertig`, {
      fileName,
      taskCount: aiResult.tasks.length
    });

    return {
      id: randomUUID(),
      fileName,
      status: "completed",
      provider: isOpenAiConfigured ? "openai" : "demo",
      ...aiResult
    };
  } catch (error) {
    console.error(`[${requestId}] Datei fehlgeschlagen`, {
      fileName,
      error: error.message
    });

    return {
      id: randomUUID(),
      fileName,
      status: "failed",
      error: error.message
    };
  }
}

function validateFile(file) {
  if (!file || typeof file !== "object") {
    throw new Error("Dateiobjekt fehlt.");
  }

  if (!file.name) {
    throw new Error("Dateiname fehlt.");
  }

  if (!file.contentBase64) {
    throw new Error("Dateiinhalt fehlt.");
  }

  if (!isSupportedFileType(file)) {
    throw new Error("Nur PDFs und Bilder werden unterstuetzt.");
  }
}

function isSupportedFileType(file) {
  const type = file.type || "";
  const lowerName = file.name.toLowerCase();

  return (
    type === "application/pdf" ||
    type.startsWith("image/") ||
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp")
  );
}

async function runDemoAnalysis(file) {
  const ocrText = await runDemoOcr(file);
  const aiResult = await runDemoAiAnalysis(ocrText, file.name);

  return {
    ocrText,
    ...aiResult
  };
}

async function runDemoOcr(file) {
  await wait(350);

  const readableType = file.type || "unbekannter Dateityp";

  return [
    `Simulierter OCR-Text aus ${file.name}.`,
    `Dateityp: ${readableType}.`,
    "In der echten App wird hier der erkannte Text aus PDF oder Bild gespeichert.",
    "Dieser Text wird anschliessend an die KI-Analyse weitergegeben."
  ].join(" ");
}

async function runDemoAiAnalysis(ocrText, fileName) {
  await wait(450);

  if (!ocrText.trim()) {
    throw new Error("OCR hat keinen Text geliefert.");
  }

  return {
    summary: `Kurzfassung fuer ${fileName}: Das Dokument wurde erkannt und in Lernstoff umgewandelt. Wichtig ist, dass OCR-Text vorhanden ist und die KI-Antwort als JSON an das Frontend zurueckgegeben wird.`,
    tasks: [
      "Markiere die drei wichtigsten Begriffe im Material.",
      "Schreibe eine eigene Zusammenfassung in fuenf Saetzen.",
      "Erstelle zwei Pruefungsfragen und beantworte sie."
    ]
  };
}

async function persistAnalysisResults(requestId, results) {
  if (!isSupabaseConfigured) {
    console.log(`[${requestId}] Supabase nicht konfiguriert, Speicherung uebersprungen`);
    return;
  }

  const rows = results.map((result) => ({
    id: result.id,
    request_id: requestId,
    file_name: result.fileName,
    status: result.status,
    ocr_text: result.ocrText || null,
    summary: result.summary || null,
    tasks: result.tasks || [],
    error: result.error || null
  }));

  const { error } = await supabase.from("analysis_results").insert(rows);

  if (error) {
    console.error(`[${requestId}] Supabase-Speicherung fehlgeschlagen`, {
      error: error.message
    });
    return;
  }

  console.log(`[${requestId}] Supabase-Speicherung erfolgreich`, {
    rowCount: rows.length
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

app.listen(port, () => {
  console.log(`Backend service listening on port ${port}`);
});
