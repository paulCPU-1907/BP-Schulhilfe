import { useEffect, useState } from "react";
import { apiUrl, shuffle } from "./utils.js";

export function LearnView({ pkg, onNavigate }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    fetch(apiUrl(`/packages/${pkg.id}/activities`))
      .then((r) => {
        if (!r.ok) throw new Error("Aktivitäten konnten nicht geladen werden.");
        return r.json();
      })
      .then((data) => setActivities(shuffle(data)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [pkg.id]);

  function recordAnswer(correct) {
    const updated = [...answers, { id: activities[currentIndex].id, correct }];
    setAnswers(updated);
    if (currentIndex + 1 >= activities.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function restart() {
    setActivities((prev) => shuffle(prev));
    setCurrentIndex(0);
    setAnswers([]);
    setFinished(false);
  }

  if (loading) {
    return (
      <section className="app-shell">
        <div className="card loading-card" style={{ margin: "2rem auto", maxWidth: 600 }}>
          <span className="loader" />
          <p>Lade Lernaktivitäten …</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <LearnShell pkg={pkg} onNavigate={onNavigate}>
        <p className="error">{error}</p>
      </LearnShell>
    );
  }

  if (activities.length === 0) {
    return (
      <LearnShell pkg={pkg} onNavigate={onNavigate}>
        <div className="card empty-state">
          <h3>Keine Aktivitäten vorhanden</h3>
          <p>Lade zuerst Material hoch, damit Lernaktivitäten erstellt werden können.</p>
          <button onClick={() => onNavigate("upload", undefined, pkg)} type="button">
            Material hochladen
          </button>
        </div>
      </LearnShell>
    );
  }

  if (finished) {
    return (
      <LearnShell pkg={pkg} onNavigate={onNavigate}>
        <ScoreCard activities={activities} answers={answers} onRestart={restart} onBack={() => onNavigate("packages")} />
      </LearnShell>
    );
  }

  const activity = activities[currentIndex];

  return (
    <LearnShell pkg={pkg} onNavigate={onNavigate}>
      <div className="progress-header">
        <span className="muted">
          {currentIndex + 1} / {activities.length}
        </span>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((currentIndex) / activities.length) * 100}%` }}
          />
        </div>
      </div>

      {activity.type === "multiple_choice" ? (
        <MultipleChoiceCard activity={activity} onAnswer={recordAnswer} />
      ) : (
        <AufgabeCard activity={activity} onAnswer={recordAnswer} />
      )}
    </LearnShell>
  );
}

function LearnShell({ pkg, onNavigate, children }) {
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
          <p className="eyebrow">Lernsession</p>
          <h1>{pkg.name}</h1>
        </div>
      </section>
      <section className="content-section learn-section">
        {children}
      </section>
    </>
  );
}

export function MultipleChoiceCard({ activity, onAnswer }) {
  const { question, options, correct_index, explanation } = activity.content;
  const [selected, setSelected] = useState(null);

  function handleSelect(index) {
    if (selected !== null) return;
    setSelected(index);
  }

  const answered = selected !== null;

  return (
    <div className="activity-card card">
      <p className="eyebrow">Multiple Choice</p>
      <h2 className="activity-question">{question}</h2>

      <ul className="mc-options">
        {options.map((option, i) => {
          let cls = "option-btn";
          if (answered) {
            if (i === correct_index) cls += " correct";
            else if (i === selected) cls += " incorrect";
            else cls += " dimmed";
          }
          return (
            <li key={i}>
              <button className={cls} onClick={() => handleSelect(i)} type="button">
                <span className="option-letter">{["A", "B", "C", "D"][i]}</span>
                {option}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div className="explanation-box">
          <strong>{selected === correct_index ? "✓ Richtig!" : "✗ Leider falsch."}</strong>
          <p>{explanation}</p>
          <button onClick={() => onAnswer(selected === correct_index)} type="button">
            Weiter →
          </button>
        </div>
      )}
    </div>
  );
}

export function AufgabeCard({ activity, onAnswer }) {
  const { question, model_answer } = activity.content;
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="activity-card card">
      <p className="eyebrow">Aufgabe</p>
      <h2 className="activity-question">{question}</h2>

      {!revealed ? (
        <button className="btn-reveal" onClick={() => setRevealed(true)} type="button">
          Musterlösung anzeigen
        </button>
      ) : (
        <div className="model-answer-box">
          <p className="eyebrow">Musterlösung</p>
          <p>{model_answer}</p>
          <div className="self-assess">
            <p className="muted">Hattest du das so oder ähnlich?</p>
            <div className="self-assess-buttons">
              <button className="btn-known" onClick={() => onAnswer(true)} type="button">
                ✓ Ja, kannte ich
              </button>
              <button className="btn-unknown" onClick={() => onAnswer(false)} type="button">
                ✗ Noch nicht
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ScoreCard({ activities, answers, onRestart, onBack }) {
  const mcActivities = activities.filter((a) => a.type === "multiple_choice");
  const aufgabeActivities = activities.filter((a) => a.type === "aufgabe");

  const mcAnswers = answers.filter((_, i) => activities[i]?.type === "multiple_choice");
  const aufgabeAnswers = answers.filter((_, i) => activities[i]?.type === "aufgabe");

  const mcCorrect = mcAnswers.filter((a) => a.correct).length;
  const aufgabeKnown = aufgabeAnswers.filter((a) => a.correct).length;

  const totalCorrect = mcCorrect + aufgabeKnown;
  const total = activities.length;
  const pct = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;

  return (
    <div className="card score-card">
      <p className="eyebrow">Ergebnis</p>
      <h2>Session abgeschlossen!</h2>

      <div className="score-big">{pct} %</div>

      <div className="score-details">
        {mcActivities.length > 0 && (
          <div className="score-row">
            <span>Multiple Choice</span>
            <strong>{mcCorrect} / {mcActivities.length} richtig</strong>
          </div>
        )}
        {aufgabeActivities.length > 0 && (
          <div className="score-row">
            <span>Aufgaben</span>
            <strong>{aufgabeKnown} / {aufgabeActivities.length} als bekannt markiert</strong>
          </div>
        )}
      </div>

      <div className="score-actions">
        <button onClick={onRestart} type="button">
          Noch einmal üben
        </button>
        <button className="btn-secondary" onClick={onBack} type="button">
          Zurück zu den Paketen
        </button>
      </div>
    </div>
  );
}
