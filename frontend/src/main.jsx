import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PackagesView } from "./PackagesView.jsx";
import { UploadView } from "./UploadView.jsx";
import { LearnView } from "./LearnView.jsx";
import { apiUrl } from "./utils.js";
import "./styles.css";

function App() {
  const [view, setView] = useState("subjects");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);

  function navigateTo(nextView, subject, pkg) {
    if (subject !== undefined) setSelectedSubject(subject);
    if (pkg !== undefined) setSelectedPackage(pkg);
    setView(nextView);
  }

  return (
    <main className="app-shell">
      {view === "subjects" && (
        <SubjectsView onNavigate={navigateTo} />
      )}
      {view === "packages" && (
        <PackagesView
          subject={selectedSubject}
          onNavigate={navigateTo}
        />
      )}
      {view === "upload" && (
        <UploadView
          pkg={selectedPackage}
          onNavigate={navigateTo}
        />
      )}
      {view === "learn" && (
        <LearnView
          pkg={selectedPackage}
          onNavigate={navigateTo}
        />
      )}
    </main>
  );
}

function SubjectsView({ onNavigate }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/subjects"))
      .then((r) => {
        if (!r.ok) throw new Error("Fächer konnten nicht geladen werden.");
        return r.json();
      })
      .then(setSubjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/subjects"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() })
      });
      if (!res.ok) throw new Error("Fehler beim Anlegen.");
      const created = await res.json();
      setSubjects((prev) => [...prev, created]);
      setNewName("");
      setShowForm(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Schulhilfe</p>
          <h1>Deine Unterrichtsfächer.</h1>
          <p className="description">
            Wähle ein Fach, um deine Lernpakete zu sehen, neues Material hochzuladen
            und Lernaktivitäten zu starten.
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="section-header">
          <h2>Fächer</h2>
          <button onClick={() => setShowForm((v) => !v)} type="button">
            {showForm ? "Abbrechen" : "+ Neues Fach"}
          </button>
        </div>

        {showForm && (
          <form className="inline-form" onSubmit={handleCreate}>
            <input
              autoFocus
              maxLength={80}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="z.B. Mathematik, Geschichte …"
              type="text"
              value={newName}
            />
            <button disabled={saving || !newName.trim()} type="submit">
              {saving ? "Speichern …" : "Anlegen"}
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}

        {loading && <p className="muted">Lade Fächer …</p>}

        {!loading && subjects.length === 0 && !error && (
          <div className="empty-state card">
            <h3>Noch keine Fächer</h3>
            <p>Lege dein erstes Unterrichtsfach an, um loszulegen.</p>
          </div>
        )}

        <ul className="subject-list">
          {subjects.map((subject) => (
            <li key={subject.id} className="subject-item card">
              <div className="subject-info">
                <strong>{subject.name}</strong>
                <span className="muted">
                  {subject.package_count === 1
                    ? "1 Lernpaket"
                    : `${subject.package_count} Lernpakete`}
                </span>
              </div>
              <button
                onClick={() => onNavigate("packages", subject, undefined)}
                type="button"
              >
                Öffnen →
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export { App };

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
