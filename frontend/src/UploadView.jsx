import { useState } from "react";
import { apiUrl, fileToPayload, formatFileSize } from "./utils.js";

const MAX_FILE_SIZE_MB = 8;

export function UploadView({ pkg, onNavigate }) {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  function handleFileChange(e) {
    setError("");
    setResults([]);
    setFiles(Array.from(e.target.files));
  }

  async function handleAnalyze() {
    if (files.length === 0) {
      setError("Bitte wähle mindestens eine PDF- oder Bilddatei aus.");
      return;
    }

    const oversized = files.find((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (oversized) {
      setError(`${oversized.name} ist größer als ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      const payload = { files: await Promise.all(files.map(fileToPayload)) };

      const res = await fetch(apiUrl(`/packages/${pkg.id}/analyze`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analyse fehlgeschlagen.");

      setResults(data.results);
      setFiles([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const allDone = results.length > 0 && results.every((r) => r.status === "completed");

  return (
    <>
      <section className="hero">
        <div>
          <button
            className="btn-back"
            onClick={() => onNavigate("packages")}
            type="button"
          >
            ← {pkg.name}
          </button>
          <p className="eyebrow">Material hochladen</p>
          <h1>Dateien analysieren.</h1>
          <p className="description">
            Lade PDFs oder Fotos von Mitschriften, Aufgaben oder Arbeitsblättern hoch.
            Das System erkennt den Text und erzeugt Lernaktivitäten.
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="card upload-panel">
          <label className="dropzone">
            <input
              accept="application/pdf,image/*"
              multiple
              onChange={handleFileChange}
              type="file"
            />
            <span>PDFs oder Bilder hier auswählen</span>
          </label>

          {files.length > 0 && (
            <ul className="file-list">
              {files.map((f) => (
                <li key={`${f.name}-${f.lastModified}`}>
                  <span>{f.name}</span>
                  <small>{formatFileSize(f.size)}</small>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="error">{error}</p>}

          <button disabled={isAnalyzing || files.length === 0} onClick={handleAnalyze} type="button">
            {isAnalyzing ? "Analyse läuft …" : "Dateien analysieren"}
          </button>
        </div>

        {isAnalyzing && (
          <div className="card loading-card">
            <span className="loader" />
            <div>
              <h3>Analyse wird ausgeführt</h3>
              <p>Text wird erkannt und Lernaktivitäten werden erstellt …</p>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="results-stack">
            {results.map((result, i) => (
              <div key={i} className="card result-card">
                <div className="result-header">
                  <div>
                    <p className="eyebrow">Analyse-Ergebnis</p>
                    <h3>{result.fileName}</h3>
                  </div>
                  <span className={`badge ${result.status}`}>{result.status}</span>
                </div>
                {result.status === "failed" ? (
                  <p className="error">{result.error}</p>
                ) : (
                  <>
                    <p>{result.summary}</p>
                    <p className="muted">
                      {result.activityCount} Lernaktivität{result.activityCount !== 1 ? "en" : ""} erstellt
                    </p>
                  </>
                )}
              </div>
            ))}

            {allDone && (
              <div className="cta-row">
                <button onClick={() => onNavigate("learn", undefined, pkg)} type="button">
                  Lernen starten →
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => { setResults([]); }}
                  type="button"
                >
                  Weitere Dateien hochladen
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
