import { useEffect, useState } from "react";
import { apiUrl } from "./utils.js";

export function PackagesView({ subject, onNavigate }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(apiUrl(`/subjects/${subject.id}/packages`))
      .then((r) => {
        if (!r.ok) throw new Error("Lernpakete konnten nicht geladen werden.");
        return r.json();
      })
      .then(setPackages)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [subject.id]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/packages"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: subject.id, name: newName.trim() })
      });
      if (!res.ok) throw new Error("Fehler beim Anlegen.");
      const created = await res.json();
      setPackages((prev) => [created, ...prev]);
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
          <button
            className="btn-back"
            onClick={() => onNavigate("subjects")}
            type="button"
          >
            ← Fächer
          </button>
          <p className="eyebrow">{subject.name}</p>
          <h1>Lernpakete.</h1>
          <p className="description">
            Ein Lernpaket fasst zusammengehörige Materialien zusammen –
            z.B. ein Kapitel oder ein Themenblock. Lade Materialien hoch
            und starte danach eine Lernsession.
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="section-header">
          <h2>Pakete in „{subject.name}"</h2>
          <button onClick={() => setShowForm((v) => !v)} type="button">
            {showForm ? "Abbrechen" : "+ Neues Lernpaket"}
          </button>
        </div>

        {showForm && (
          <form className="inline-form" onSubmit={handleCreate}>
            <input
              autoFocus
              maxLength={120}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="z.B. Kapitel 3 – Dreiecke, Weimarer Republik …"
              type="text"
              value={newName}
            />
            <button disabled={saving || !newName.trim()} type="submit">
              {saving ? "Speichern …" : "Anlegen"}
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}
        {loading && <p className="muted">Lade Lernpakete …</p>}

        {!loading && packages.length === 0 && !error && (
          <div className="empty-state card">
            <h3>Noch keine Lernpakete</h3>
            <p>Lege dein erstes Lernpaket an und lade dann Material hoch.</p>
          </div>
        )}

        <ul className="package-list">
          {packages.map((pkg) => (
            <li key={pkg.id} className="package-item card">
              <div className="package-info">
                <strong>{pkg.name}</strong>
                <span className="muted">
                  {pkg.material_count === 1
                    ? "1 Material"
                    : `${pkg.material_count} Materialien`}
                </span>
              </div>
              <div className="package-actions">
                <button
                  className="btn-secondary"
                  onClick={() => onNavigate("upload", undefined, pkg)}
                  type="button"
                >
                  Material hochladen
                </button>
                <button
                  disabled={pkg.material_count === 0}
                  onClick={() => onNavigate("learn", undefined, pkg)}
                  type="button"
                >
                  Lernen →
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
