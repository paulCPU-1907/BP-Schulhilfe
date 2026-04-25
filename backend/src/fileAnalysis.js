import { analyzeWithOpenAi, isOpenAiConfigured } from "./openai.js";

export function validateFile(file) {
  if (!file || typeof file !== "object") throw new Error("Dateiobjekt fehlt.");
  if (!file.name) throw new Error("Dateiname fehlt.");
  if (!file.contentBase64) throw new Error("Dateiinhalt fehlt.");
  if (!isSupportedFileType(file)) throw new Error("Nur PDFs und Bilder werden unterstuetzt.");
}

export function isSupportedFileType(file) {
  const type = file.type || "";
  const lowerName = (file.name || "").toLowerCase();
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

export async function runAnalysis(file) {
  return isOpenAiConfigured ? await analyzeWithOpenAi(file) : await runDemoAnalysis(file);
}

async function runDemoAnalysis(file) {
  await wait(800);
  const ocrText = [
    `Simulierter OCR-Text aus ${file.name}.`,
    `Dateityp: ${file.type || "unbekannter Dateityp"}.`,
    "In der echten App steht hier der erkannte Text aus dem Dokument."
  ].join(" ");

  return {
    ocrText,
    summary: `Demo-Zusammenfassung fuer ${file.name}: Das Dokument wurde erkannt und verarbeitet.`,
    tasks: [
      "Markiere die drei wichtigsten Begriffe im Material.",
      "Schreibe eine eigene Zusammenfassung in fuenf Saetzen.",
      "Erstelle zwei Pruefungsfragen und beantworte sie."
    ],
    multiple_choice_questions: [
      {
        question: "Was ist das Hauptziel beim aktiven Lernen?",
        options: [
          "Den Text moeglichst schnell lesen",
          "Den Inhalt verstehen und verarbeiten",
          "Alle Woerter auswendig lernen",
          "Das Dokument speichern"
        ],
        correct_index: 1,
        explanation: "Aktives Lernen zielt darauf ab, Inhalte wirklich zu verstehen – nicht mechanisch zu memorieren."
      },
      {
        question: "Welche Methode hilft am meisten beim langfristigen Behalten?",
        options: [
          "Einmaliges Lesen",
          "Passives Zuhoeren",
          "Aktive Wiederholung (Active Recall)",
          "Den Text markieren"
        ],
        correct_index: 2,
        explanation: "Active Recall – das aktive Abrufen aus dem Gedaechtnis – ist wissenschaftlich die effektivste Lernmethode."
      },
      {
        question: "Was macht man sinnvollerweise direkt nach dem ersten Lesen?",
        options: [
          "Sofort den naechsten Text lesen",
          "Das Gelernte in eigenen Worten zusammenfassen",
          "Den Text ausdrucken",
          "Nichts – Pause machen"
        ],
        correct_index: 1,
        explanation: "Das Zusammenfassen in eigenen Worten zeigt und festigt das echte Verstaendnis."
      }
    ],
    aufgaben: [
      {
        question: "Erklaere in zwei bis drei Saetzen, worum es in diesem Dokument geht.",
        model_answer: "Das Dokument behandelt grundlegende Lernstrategien und zeigt, wie man Inhalte aktiv verarbeitet. Besonders wichtig sind Wiederholung und das Zusammenfassen in eigenen Worten. Wer versteht statt auswendig zu lernen, behaelt mehr."
      },
      {
        question: "Nenne zwei wichtige Erkenntnisse aus diesem Material und begruende kurz, warum sie relevant sind.",
        model_answer: "1. Verstehen schlaegt Auswendiglernen – wer Zusammenhaenge versteht, kann Wissen flexibler anwenden. 2. Aktive Wiederholung ist effektiver als passives Wiederlesen, weil das Gehirn beim Abrufen staerker trainiert wird."
      }
    ]
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
