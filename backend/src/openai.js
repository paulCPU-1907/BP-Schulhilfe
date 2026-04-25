const openAiApiKey = process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
const openAiBaseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

export const isOpenAiConfigured = Boolean(openAiApiKey);

export function getOpenAiStatus() {
  return {
    configured: isOpenAiConfigured,
    model: openAiModel
  };
}

export async function analyzeWithOpenAi(file) {
  if (!isOpenAiConfigured) {
    throw new Error("OpenAI ist nicht konfiguriert.");
  }

  const response = await fetch(`${openAiBaseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: openAiModel,
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
                "Alle Texte auf Deutsch. Antworte ausschliesslich als JSON passend zum Schema."
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: buildOpenAiFileInput(file)
        }
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
              ocrText: {
                type: "string",
                description: "Der erkannte Text aus der Datei. Wenn kaum Text sichtbar ist, beschreibe knapp was erkannt wurde."
              },
              summary: {
                type: "string",
                description: "Eine kurze deutsche Zusammenfassung des Lernmaterials (3-5 Saetze)."
              },
              tasks: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                items: { type: "string" },
                description: "Allgemeine Lernaufgaben auf Deutsch."
              },
              multiple_choice_questions: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                description: "Multiple-Choice-Fragen zum Inhalt des Dokuments.",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    question: {
                      type: "string",
                      description: "Die Frage auf Deutsch."
                    },
                    options: {
                      type: "array",
                      minItems: 4,
                      maxItems: 4,
                      items: { type: "string" },
                      description: "Genau vier Antwortoptionen, davon eine korrekt."
                    },
                    correct_index: {
                      type: "integer",
                      description: "Index der korrekten Antwort (0-3)."
                    },
                    explanation: {
                      type: "string",
                      description: "Kurze Erklaerung warum diese Antwort korrekt ist."
                    }
                  },
                  required: ["question", "options", "correct_index", "explanation"]
                }
              },
              aufgaben: {
                type: "array",
                minItems: 2,
                maxItems: 4,
                description: "Offene Aufgaben mit Musterloesung fuer Selbstbewertung.",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    question: {
                      type: "string",
                      description: "Die offene Aufgabe auf Deutsch."
                    },
                    model_answer: {
                      type: "string",
                      description: "Eine Musterloesung, die der Schueler nach eigenem Versuch aufdecken kann."
                    }
                  },
                  required: ["question", "model_answer"]
                }
              }
            },
            required: ["ocrText", "summary", "tasks", "multiple_choice_questions", "aufgaben"]
          }
        }
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI Analyse fehlgeschlagen.");
  }

  const outputText = data.output_text || extractOutputText(data);

  if (!outputText) {
    throw new Error("OpenAI hat kein auswertbares Ergebnis geliefert.");
  }

  return JSON.parse(outputText);
}

function buildOpenAiFileInput(file) {
  const content = [
    {
      type: "input_text",
      text: `Analysiere diese Datei: ${file.name}`
    }
  ];

  if (isImageFile(file)) {
    content.push({
      type: "input_image",
      image_url: toDataUrl(file)
    });
    return content;
  }

  if (isPdfFile(file)) {
    content.push({
      type: "input_file",
      filename: file.name,
      file_data: toDataUrl(file)
    });
    return content;
  }

  throw new Error("Nur PDFs und Bilder werden fuer OpenAI OCR unterstuetzt.");
}

function toDataUrl(file) {
  return `data:${file.type || "application/octet-stream"};base64,${file.contentBase64}`;
}

function isImageFile(file) {
  return (file.type || "").startsWith("image/");
}

function isPdfFile(file) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function extractOutputText(data) {
  return data.output
    ?.flatMap((item) => item.content || [])
    .find((contentItem) => contentItem.type === "output_text")?.text;
}
