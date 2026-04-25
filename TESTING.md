# Testing

## Aktueller Stand

Es gibt noch keine automatisierten Tests. Das Projekt ist ein MVP mit Debug-Fokus.
Alle Verifikationen laufen aktuell manuell ueber lokale Ausfuehrung.

---

## Manuelle Teststrecke (aktuell)

### 1. Backend starten und Healthchecks pruefen

```bash
cd backend && npm run dev
```

- `GET /health` → `{ status: "ok" }`
- `GET /api/health` → Zustand von OpenAI und Supabase
- `GET /api/openai/health` → `{ status: "ok" }` wenn Key gesetzt
- `GET /api/supabase/health` → `{ status: "ok" }` wenn Tabelle erreichbar

### 2. Demo-Modus (ohne OpenAI-Key)

- `OPENAI_API_KEY` aus `.env` entfernen oder leer lassen
- `/api/analyze` mit einer Testdatei aufrufen
- Ergebnis: simulierter OCR-Text, feste Zusammenfassung, drei Demo-Aufgaben
- Status: `provider: "demo"`

### 3. OpenAI End-to-End (mit echtem Key)

- Bild oder PDF hochladen
- Ergebnis enthaelt: `ocrText`, `summary`, `tasks` (3–5 Eintraege)
- Status: `provider: "openai"`, `status: "completed"`

### 4. Supabase-Persistenz

- Nach einer Analyse: in Supabase unter `analysis_results` pruefen
- Erwartete Felder: `id`, `request_id`, `file_name`, `status`, `ocr_text`, `summary`, `tasks`, `created_at`

### 5. Fehlerfall: nicht unterstuetzter Dateityp

- `.txt`-Datei hochladen
- Erwartet: `status: "failed"`, `error: "Nur PDFs und Bilder werden unterstuetzt."`

### 6. Fehlerfall: Datei zu gross

- Datei > 8 MB auswaehlen
- Erwartet: Fehlermeldung im Frontend, kein Request ans Backend

---

## Geplante automatisierte Tests

Sobald Tests eingefuehrt werden, gilt diese Strategie:

### Backend (Unit + Integration)

| Was | Wie |
|---|---|
| `validateFile()` – gueltiger und ungueltiger Input | Unit-Test mit `node:test` oder Vitest |
| `isSupportedFileType()` – alle Dateitypen | Unit-Test |
| `runDemoAnalysis()` – Demo-Pfad | Unit-Test |
| `POST /api/analyze` – Demo-Modus ohne OpenAI | Integration-Test gegen echten Express-Server |
| `POST /api/analyze` – Fehlerfall (keine Dateien) | Integration-Test |
| Supabase-Persistenz | Integration-Test gegen lokale Supabase-Instanz oder Mock |

**Wichtig:** Supabase-Tests sollen gegen eine echte Instanz laufen, nicht gegen Mocks (Risiko: Mock/Prod-Divergenz). Lokale Supabase-CLI oder Test-Projekt verwenden.

### Frontend

| Was | Wie |
|---|---|
| Dateigroessen-Validierung | Vitest + Testing Library |
| `fileToPayload()` – Base64-Encoding | Vitest |
| ResultCard – Rendering von `completed` und `failed` | Vitest + Testing Library |

### Empfohlenes Test-Framework

- Backend: `node:test` (kein extra Dependency) oder **Vitest** (einheitlich mit Frontend)
- Frontend: **Vitest** + **@testing-library/react**
- HTTP-Tests: **supertest**

---

## Hinweise fuer spaetere CI-Integration

- Tests laufen idealerweise in GitHub Actions vor dem Frontend-Deploy
- Supabase-Tests koennen gegen `supabase start` (lokale CLI) laufen
- OpenAI-Calls in Tests immer mocken (Kostenkontrolle, Determinismus)
