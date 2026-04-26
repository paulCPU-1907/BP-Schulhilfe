# Testing

## Automatisierte Tests (Stand 2026-04-26)

### Ausführen

```bash
# Backend (49 Tests)
cd backend && npm test

# Frontend (33 Tests)
cd frontend && npm test

# Watch-Modus (während der Entwicklung)
cd backend && npm run test:watch
cd frontend && npm run test:watch
```

### Ergebnis lokal verifiziert

```
backend:  Test Files 4 passed  |  Tests 49 passed
frontend: Test Files 3 passed  |  Tests 33 passed
```

---

## Test-Framework

| Schicht | Tool |
|---|---|
| Backend Unit + Integration | **Vitest** + **Supertest** |
| Frontend Unit | **Vitest** |
| Frontend Komponenten | **Vitest** + **@testing-library/react** + **@testing-library/user-event** |
| CI | **GitHub Actions** (läuft vor dem Frontend-Build) |

---

## Backend-Tests (`backend/src/__tests__/`)

### `fileAnalysis.test.js` – Unit-Tests

| Test | Was wird geprüft |
|---|---|
| `validateFile` – gültige PDF/Bild | kein Fehler |
| `validateFile` – null, kein Objekt | wirft "Dateiobjekt fehlt." |
| `validateFile` – kein Name | wirft "Dateiname fehlt." |
| `validateFile` – kein contentBase64 | wirft "Dateiinhalt fehlt." |
| `validateFile` – .txt | wirft "Nur PDFs und Bilder..." |
| `isSupportedFileType` – alle Typen | PDF ✓, PNG ✓, JPG ✓, WEBP ✓, TXT ✗, DOCX ✗ |
| `runAnalysis` Demo-Modus | vollständiges Ergebnisobjekt, 4 Optionen pro MC |

### `api.test.js` – Integrationstests (Supabase + OpenAI gemockt)

| Test | Was wird geprüft |
|---|---|
| `GET /health` | 200, `status: "ok"` |
| `GET /api/health` | openai + supabase im Body |
| `GET /api/openai/health` | 503 wenn nicht konfiguriert |
| `POST /api/analyze` – keine files | 400 |
| `POST /api/analyze` – Demo-PDF | `status: "completed"`, `provider: "demo"` |
| `POST /api/analyze` – .txt | `status: "failed"` |
| `POST /api/analyze` – 3 Dateien | 2 completed, 1 failed |

### `subjects.test.js` – Integrationstests

| Test | Was wird geprüft |
|---|---|
| `GET /api/subjects` | Liste mit `package_count` |
| `POST /api/subjects` | 201, `package_count: 0`, Trimming |
| Fehlerfall (400 / 500) | korrekte HTTP-Statuscodes |
| `GET /api/subjects/:id/packages` | Liste mit `material_count` |
| `POST /api/packages` | 201, Pflichtfelder geprüft |

### `packages.test.js` – Integrationstests

| Test | Was wird geprüft |
|---|---|
| `GET /api/packages/:id` | Paket mit Materialien und `activity_count` |
| `GET /api/packages/:id/activities` | Aktivitätsliste, Leerfall |
| `POST /api/packages/:id/analyze` – Demo | `status: "completed"`, Supabase-Schreibvorgänge verifiziert |
| `POST /api/packages/:id/analyze` – .txt | `status: "failed"`, kein Supabase-Schreibvorgang |
| `POST /api/packages/:id/analyze` – DB-Fehler | `status: "failed"` mit Fehlermeldung |

---

## Frontend-Tests (`frontend/src/__tests__/`)

### `utils.test.js` – Unit-Tests

| Test | Was wird geprüft |
|---|---|
| `formatFileSize` | KB / MB, Rundung, exakt 1 MB |
| `shuffle` | kein Mutation, keine Verluste, Reihenfolge geändert |

### `App.test.jsx` – SubjectsView-Komponente

| Test | Was wird geprüft |
|---|---|
| Ladezustand | "Lade Fächer …" sichtbar |
| Leerzustand / Fächerliste / Fehlerfall | korrekte Zustände |
| Singular/Plural | "1 Lernpaket" vs. "N Lernpakete" |
| Fach anlegen | Formular → POST → neues Fach in Liste |

### `LearnView.test.jsx` – Lernkarten

| Komponente | Getestetes Verhalten |
|---|---|
| `MultipleChoiceCard` | Anzeige, richtig/falsch, Callback, Lock nach Auswahl |
| `AufgabeCard` | Reveal, Musterlösung, Selbstbewertung-Callback |
| `ScoreCard` | Prozentwert, Statistik, Restart/Back-Callbacks |

---

## Mocking-Strategie

### Backend
- **Supabase**: `vi.mock("../supabase.js")` ersetzt den Client durch einen **thenable Chain-Mock**.  
  Jede Methode gibt die Chain zurück; die Chain ist direkt awaitable (`then` implementiert).
- **OpenAI**: `vi.mock("../openai.js")` mit `isOpenAiConfigured: false` → Demo-Modus.
- **Supertest**: übergibt den exportierten Express-`app` ohne `listen()`.

### Frontend
- **fetch**: `global.fetch = vi.fn()` pro Testdatei konfigurierbar.
- **DOM**: jsdom (Vitest-Environment).

---

## CI-Integration

Der GitHub Actions Workflow (`.github/workflows/deploy-pages.yml`) führt vor dem Build einen `test`-Job aus:

```
test → build → deploy
```

Schlägt ein Test fehl, wird weder gebaut noch deployed.

---

## Manuelle Teststrecke (E2E – noch nicht automatisiert)

### 1. Demo-Modus (ohne OpenAI-Key)
- `OPENAI_API_KEY` aus `.env` entfernen
- PDF hochladen → Demo-Aktivitäten erscheinen → Lernsession funktioniert

### 2. OpenAI End-to-End
- Bild oder PDF hochladen → echter OCR-Text, Zusammenfassung, Lernaufgaben

### 3. Supabase-Persistenz
- Nach Analyse: in Supabase unter `learning_materials` und `learning_activities` prüfen

### 4. Edge Function (Production)
```bash
curl https://pwhmafuitbikbwmsfjjb.supabase.co/functions/v1/subjects
curl -X POST .../subjects -H "Content-Type: application/json" -d '{"name":"Test"}'
```

---

## Geplante Erweiterungen

- **E2E-Tests mit Playwright**: vollständiger Lernfluss im Browser
- **Supabase-Integrationstests**: gegen echte Test-Instanz für Migrationssicherheit
- **Coverage-Report**: `npm run test -- --coverage` (`@vitest/coverage-v8` bereits installiert)
- **Edge Function Tests**: Deno-Testrunner für `supabase/functions/`
