import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";

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
    service: "bp-backend"
  });
});

app.get("/api/message", (_request, response) => {
  response.json({
    message: "Hallo vom Backend Microservice!"
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

    const ocrText = await runOcr(file);

    console.log(`[${requestId}] OCR fertig`, {
      fileName,
      textLength: ocrText.length
    });

    const aiResult = await runAiAnalysis(ocrText, fileName);

    console.log(`[${requestId}] KI fertig`, {
      fileName,
      taskCount: aiResult.tasks.length
    });

    return {
      id: randomUUID(),
      fileName,
      status: "completed",
      ocrText,
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

async function runOcr(file) {
  await wait(350);

  const readableType = file.type || "unbekannter Dateityp";

  return [
    `Simulierter OCR-Text aus ${file.name}.`,
    `Dateityp: ${readableType}.`,
    "In der echten App wird hier der erkannte Text aus PDF oder Bild gespeichert.",
    "Dieser Text wird anschliessend an die KI-Analyse weitergegeben."
  ].join(" ");
}

async function runAiAnalysis(ocrText, fileName) {
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

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

app.listen(port, () => {
  console.log(`Backend service listening on port ${port}`);
});
