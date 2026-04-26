import { describe, it, expect } from "vitest";
import { validateFile, isSupportedFileType, runAnalysis } from "../fileAnalysis.js";

const pdf = { name: "aufgaben.pdf", type: "application/pdf", contentBase64: "dGVzdA==" };
const png = { name: "foto.png", type: "image/png", contentBase64: "dGVzdA==" };

// ── validateFile ──────────────────────────────────────────────────────────────

describe("validateFile", () => {
  it("akzeptiert eine gültige PDF-Datei", () => {
    expect(() => validateFile(pdf)).not.toThrow();
  });

  it("akzeptiert ein gültiges Bild", () => {
    expect(() => validateFile(png)).not.toThrow();
  });

  it("wirft wenn file null ist", () => {
    expect(() => validateFile(null)).toThrow("Dateiobjekt fehlt.");
  });

  it("wirft wenn file kein Objekt ist", () => {
    expect(() => validateFile("string")).toThrow("Dateiobjekt fehlt.");
  });

  it("wirft wenn name fehlt", () => {
    expect(() => validateFile({ type: "application/pdf", contentBase64: "abc" })).toThrow(
      "Dateiname fehlt.",
    );
  });

  it("wirft wenn contentBase64 fehlt", () => {
    expect(() => validateFile({ name: "test.pdf", type: "application/pdf" })).toThrow(
      "Dateiinhalt fehlt.",
    );
  });

  it("wirft bei nicht-unterstütztem Dateityp", () => {
    expect(() =>
      validateFile({ name: "test.txt", type: "text/plain", contentBase64: "abc" }),
    ).toThrow("Nur PDFs und Bilder werden unterstuetzt.");
  });
});

// ── isSupportedFileType ───────────────────────────────────────────────────────

describe("isSupportedFileType", () => {
  it.each([
    [{ name: "doc.pdf", type: "application/pdf" }, true],
    [{ name: "foto.png", type: "image/png" }, true],
    [{ name: "foto.jpg", type: "image/jpeg" }, true],
    [{ name: "foto.webp", type: "image/webp" }, true],
    [{ name: "doc.pdf", type: "" }, true],        // Erkennung via Dateiname
    [{ name: "foto.jpg", type: "" }, true],        // Erkennung via Dateiname
    [{ name: "text.txt", type: "text/plain" }, false],
    [{ name: "doc.docx", type: "application/vnd.openxmlformats..." }, false],
    [{ name: "unknown", type: "" }, false],
  ])("klassifiziert %j korrekt als %s", (file, expected) => {
    expect(isSupportedFileType(file)).toBe(expected);
  });
});

// ── runAnalysis (Demo-Modus) ──────────────────────────────────────────────────

describe("runAnalysis (ohne OpenAI-Key = Demo-Modus)", () => {
  it("liefert ein vollständiges Ergebnisobjekt im Demo-Modus", async () => {
    const result = await runAnalysis(pdf);

    expect(result).toHaveProperty("ocrText");
    expect(result).toHaveProperty("summary");
    expect(result.tasks).toBeInstanceOf(Array);
    expect(result.tasks.length).toBeGreaterThanOrEqual(3);
    expect(result.multiple_choice_questions).toBeInstanceOf(Array);
    expect(result.multiple_choice_questions.length).toBeGreaterThanOrEqual(3);
    expect(result.aufgaben).toBeInstanceOf(Array);
    expect(result.aufgaben.length).toBeGreaterThanOrEqual(2);
  });

  it("enthält den Dateinamen im OCR-Text", async () => {
    const result = await runAnalysis(pdf);
    expect(result.ocrText).toContain(pdf.name);
  });

  it("MC-Fragen haben je 4 Antwortoptionen", async () => {
    const result = await runAnalysis(pdf);
    for (const mc of result.multiple_choice_questions) {
      expect(mc.options).toHaveLength(4);
      expect(typeof mc.correct_index).toBe("number");
      expect(mc.explanation).toBeTruthy();
    }
  });

  it("Aufgaben haben question und model_answer", async () => {
    const result = await runAnalysis(pdf);
    for (const aufgabe of result.aufgaben) {
      expect(aufgabe.question).toBeTruthy();
      expect(aufgabe.model_answer).toBeTruthy();
    }
  });
});
