# Backlog

## Offene Sicherheitsaufgaben

- [ ] Supabase Secret Key rotieren und `backend/.env` aktualisieren (Key wurde im Chat geteilt).
- [ ] OpenAI API Key rotieren und `backend/.env` aktualisieren (Key wurde im Chat geteilt).

---

## Schuljahr & Prüfungsplanung

**Kontext:** Schüler plant sein Lernen rund um konkrete Prüfungstermine. Ein Schuljahr enthält mehrere Fächer, pro Fach ca. 10 Prüfungen.

- [ ] Entität `school_years` einführen (z.B. "2025/2026") als übergeordneten Rahmen.
- [ ] Entität `exams` einführen: gehört zu `subject_id` + `school_year_id`, enthält Name, Datum, optionale Beschreibung (z.B. "Schulaufgabe 3 – Trigonometrie").
- [ ] Supabase-Schema für `school_years` und `exams` entwerfen und deployen.
- [ ] Backend-Routen für CRUD auf `school_years` und `exams`.
- [ ] Beziehung: Ein Unterrichtsfach kann pro Schuljahr beliebig viele Prüfungen haben (~10 typisch).

---

## Schüler-Dashboard

**Kontext:** Die App-Startseite soll kein leerer Fächerindex sein, sondern ein aktives Dashboard, das den Schüler direkt führt.

- [ ] Dashboard-View als neue Startseite.
- [ ] Anzeige aller Fächer mit nächstem Prüfungstermin und Countdown ("in 5 Tagen").
- [ ] Priorisierung: Fächer mit nahenden Prüfungen erscheinen zuerst.
- [ ] Prüfungsdatum direkt im Dashboard hinterlegen können (Inline-Formular).
- [ ] "Heute lernen"-Empfehlung: konkrete Lernaktivität vorschlagen, direkt startbar.
- [ ] Visueller Fortschrittsindikator pro Fach/Lernpaket (wie viel wurde bereits gelernt).

---

## Lernfortschritt & Spaced Repetition

**Kontext:** Damit die App "weiß", was ein Schüler kann, muss Lernfortschritt serverseitig gespeichert werden. Die Wiederholungslogik soll auf wissenschaftlich belegten Methoden basieren.

### Wissenschaftliche Grundlage

Die Implementierung orientiert sich an folgenden belegten Erkenntnissen:

- **Ebbinghaus'sche Vergessenskurve** (1885): Ohne Wiederholung vergisst das Gehirn neues Wissen exponentiell schnell. Erste Wiederholung nach 1 Tag, dann 3, 7, 14, 30 Tage.
- **Spaced Repetition System (SRS)** – SM-2-Algorithmus (SuperMemo, Wozniak 1987): Berechnet den optimalen Wiederholungszeitpunkt anhand der bisherigen Antwortqualität. Gut bekannte Inhalte werden seltener, schwache Inhalte häufiger wiederholt.
- **Active Recall / Testing Effect** (Roediger & Karpicke, 2006): Aktives Abrufen aus dem Gedächtnis ist deutlich effektiver als passives Wiederlesen. Multiple-Choice und offene Aufgaben sind ideal.
- **Interleaving** (Kornell & Bjork, 2008): Das Mischen verschiedener Themen in einer Session verbessert langfristiges Behalten, auch wenn es sich schwerer anfühlt.
- **Desirable Difficulties** (Bjork, 1994): Leichtes Lernen führt zu schlechterem Behalten. Angemessene Schwierigkeit und Variabilität stärken das Langzeitgedächtnis.

### Zu implementieren

- [ ] Tabelle `activity_results` in Supabase: speichert pro Aktivität, pro Schüler: Zeitstempel, Ergebnis (richtig/falsch/selbst bewertet), Qualitätsscore (0–5, angelehnt an SM-2).
- [ ] SM-2-Algorithmus implementieren: berechnet `next_review_date` und `interval_days` für jede Aktivität anhand des Qualitätsscores.
- [ ] Lernfortschritt am Ende jeder Lernsession (LearnView) serverseitig speichern statt nur im lokalen State.
- [ ] "Fällige Wiederholungen"-Logik: Aktivitäten, deren `next_review_date` erreicht oder überschritten ist, werden priorisiert vorgeschlagen.
- [ ] Schwache Aktivitäten (Qualitätsscore < 3) werden häufiger wiederholt, starke (Score ≥ 4) seltener.
- [ ] Interleaving: Lernempfehlung mischt Aktivitäten aus verschiedenen Lernpaketen desselben Fachs, nicht nur chronologisch.
- [ ] Dashboard zeigt: "X Wiederholungen fällig" pro Fach – direkt startbar.

---

## Backend-Deployment

- [ ] Backend auf einer externen Plattform deployen (Render, Railway, Fly.io o.ä.).
- [ ] `VITE_API_BASE_URL` als GitHub-Actions-Variable setzen, sobald Backend-URL bekannt.
- [ ] CORS im Backend auf die öffentliche Frontend-URL einschränken.
- [ ] Rate-Limiting auf `/api/analyze` einführen (z.B. `express-rate-limit`).
- [ ] Authentifizierung evaluieren (aktuell: keine – jeder mit Backend-URL kann Analysen triggern).

---

## Technische Schulden & Tests

- [ ] Automatisierte Tests für Backend-Endpoints einführen (Vitest + Supertest).
- [ ] Supabase-Tests gegen echte Test-Instanz (nicht Mocks).
- [ ] GitHub Actions Workflow auf "GitHub Actions"-Modus umstellen, sobald Admin-Zugang vorhanden (aktuell: Legacy-Modus mit statischem Root-Build).
- [ ] Build-Artefakte (`index.html`, `assets/`) aus dem Root entfernen, sobald Pages-Modus geändert ist.
