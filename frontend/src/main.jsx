import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const MAX_FILE_SIZE_MB = 8;
const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || "/api");

function App() {
  const [backendStatus, setBackendStatus] = useState("Pruefe Backend...");
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/health"))
      .then((response) => {
        if (!response.ok) {
          throw new Error("Healthcheck fehlgeschlagen");
        }

        return response.json();
      })
      .then((data) => setBackendStatus(`${data.service}: ${data.status}`))
      .catch(() => setBackendStatus("Backend ist aktuell nicht erreichbar."));
  }, []);

  function handleFileChange(event) {
    setError("");
    setResults([]);
    setFiles(Array.from(event.target.files));
  }

  async function handleAnalyze() {
    if (files.length === 0) {
      setError("Bitte waehle mindestens eine PDF- oder Bilddatei aus.");
      return;
    }

    const oversizedFile = files.find((file) => file.size > MAX_FILE_SIZE_MB * 1024 * 1024);

    if (oversizedFile) {
      setError(`${oversizedFile.name} ist groesser als ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      console.log("[frontend] Starte Analyse", {
        files: files.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type
        }))
      });

      const payload = {
        files: await Promise.all(files.map(fileToPayload))
      };

      const response = await fetch(apiUrl("/analyze"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analyse fehlgeschlagen");
      }

      console.log("[frontend] Analyse-Ergebnis erhalten", data);
      setResults(data.results);
    } catch (analyzeError) {
      console.error("[frontend] Analyse-Fehler", analyzeError);
      setError(analyzeError.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Lern-App Debug MVP</p>
          <h1>Multi-Upload mit sichtbarem KI-Flow.</h1>
          <p className="description">
            Waehle mehrere PDFs oder Bilder aus. Das Backend verarbeitet jede Datei
            einzeln und gibt strukturierte Ergebnisse zurueck.
          </p>
        </div>
        <div className="status-box">
          <span>Backend Status</span>
          <strong>{backendStatus}</strong>
        </div>
      </section>

      <section className="workspace">
        <article className="card upload-panel">
          <p className="eyebrow">Upload</p>
          <h2>Dateien auswaehlen</h2>
          <label className="dropzone">
            <input
              accept="application/pdf,image/*"
              multiple
              onChange={handleFileChange}
              type="file"
            />
            <span>PDFs oder Bilder hier auswaehlen</span>
          </label>

          {files.length > 0 && (
            <ul className="file-list">
              {files.map((file) => (
                <li key={`${file.name}-${file.lastModified}`}>
                  <span>{file.name}</span>
                  <small>{formatFileSize(file.size)}</small>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="error">{error}</p>}

          <button disabled={isAnalyzing} onClick={handleAnalyze} type="button">
            {isAnalyzing ? "Analyse laeuft..." : "Dateien analysieren"}
          </button>
        </article>

        <article className="card flow-panel">
          <p className="eyebrow">Debug Checkliste</p>
          <h2>Wo wir loggen</h2>
          <ol className="debug-list">
            <li>Frontend: Dateien ausgewaehlt und Request gesendet</li>
            <li>Backend: Request angekommen und Dateianzahl erkannt</li>
            <li>Backend: OCR-Schritt pro Datei beendet</li>
            <li>Backend: KI-Ergebnis pro Datei erzeugt</li>
            <li>Frontend: Response erhalten und State aktualisiert</li>
          </ol>
        </article>
      </section>

      <section className="results-grid">
        {isAnalyzing && (
          <article className="card loading-card">
            <span className="loader" />
            <div>
              <h2>Analyse wird ausgefuehrt</h2>
              <p>Die Dateien werden nacheinander verarbeitet. Danach erscheinen hier die Ergebnisse.</p>
            </div>
          </article>
        )}

        {!isAnalyzing && results.length === 0 && (
          <article className="card empty-state">
            <h2>Noch keine Ergebnisse</h2>
            <p>
              Starte den Multi-Upload, um Zusammenfassungen und Aufgaben pro Datei
              direkt im Frontend zu sehen.
            </p>
          </article>
        )}

        {results.map((result) => (
          <ResultCard key={result.id} result={result} />
        ))}
      </section>
    </main>
  );
}

function ResultCard({ result }) {
  return (
    <article className="card result-card">
      <div className="result-header">
        <div>
          <p className="eyebrow">Analyse-Ergebnis</p>
          <h2>{result.fileName}</h2>
        </div>
        <span className={`badge ${result.status}`}>{result.status}</span>
      </div>

      {result.status === "failed" ? (
        <p className="error">{result.error}</p>
      ) : (
        <>
          <section>
            <h3>Erkannter Text</h3>
            <p>{result.ocrText}</p>
          </section>
          <section>
            <h3>Zusammenfassung</h3>
            <p>{result.summary}</p>
          </section>
          <section>
            <h3>Aufgaben</h3>
            <ul className="task-list">
              {result.tasks.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </article>
  );
}

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        contentBase64: String(reader.result).split(",")[1] || ""
      });
    };

    reader.onerror = () => reject(new Error(`${file.name} konnte nicht gelesen werden.`));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(size) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function normalizeApiBaseUrl(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

createRoot(document.getElementById("root")).render(<App />);
