# BP

BP ist als kleine Microservice-Architektur aufgebaut:

- `frontend`: Web-Frontend auf Basis von Vite
- `backend`: HTTP-API auf Basis von Node.js und Express
- `docker-compose.yml`: lokale Orchestrierung beider Services

## Architektur

```text
Browser
  |
  v
Frontend (:5173)
  |
  v
Backend API (:3000)
```

Das Frontend ruft das Backend ueber `/api` auf. In der lokalen Docker-Umgebung leitet Vite diese Requests an den Backend-Service weiter.

## Lokal starten

Kopiere zuerst die Beispiel-Umgebung fuer das Backend und trage deine Supabase-Werte ein:

```bash
cp backend/.env.example backend/.env
```

Die Werte findest du in Supabase unter Project Settings -> API:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

Lege danach in Supabase die Tabelle aus `supabase/schema.sql` im SQL Editor an.
Wenn `OPENAI_API_KEY` gesetzt ist, nutzt das Backend OpenAI fuer OCR und Lernanalyse.
Ohne OpenAI-Key laeuft die App weiter mit simulierten Demo-Ergebnissen.

Mit Docker:

```bash
docker compose up --build
```

Danach sind die Services erreichbar:

- Frontend: `http://localhost:5173`
- Backend Healthcheck: `http://localhost:3000/health`
- Supabase Healthcheck: `http://localhost:3000/api/supabase/health`
- OpenAI Healthcheck: `http://localhost:3000/api/openai/health`

Ohne Docker koennen beide Services separat gestartet werden:

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

## Deployment

Das Projekt wird online in zwei Teile aufgeteilt:

- Frontend auf GitHub Pages
- Backend auf einer separaten Server-Plattform mit Environment Variables fuer Secrets

GitHub Pages kann nur statische Dateien hosten. Das Express-Backend laeuft dort nicht.
`OPENAI_API_KEY` und `SUPABASE_SECRET_KEY` duerfen deshalb nur in der Backend-Umgebung liegen.

### Frontend fuer GitHub Pages

Das Frontend unterstuetzt fuer den Build diese Variablen:

```text
VITE_API_BASE_URL=https://your-backend.example.com/api
VITE_APP_BASE_PATH=/your-repository-name/
```

- `VITE_API_BASE_URL` ist die oeffentliche Basis-URL des Backend-APIs
- `VITE_APP_BASE_PATH` ist der GitHub-Pages-Basispfad fuer Projektseiten

Eine Beispielkonfiguration liegt in `frontend/.env.example`.

Es gibt ausserdem einen GitHub-Actions-Workflow in `.github/workflows/deploy-pages.yml`,
der das Frontend fuer GitHub Pages baut und deployed.

### Backend separat deployen

Das Backend braucht online mindestens:

```text
PORT=3000
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

Diese Werte gehoeren in die Environment Variables der Backend-Plattform, nicht ins Repository.

## Struktur

```text
BP/
  backend/
    src/
    Dockerfile
    package.json
  frontend/
    src/
    Dockerfile
    package.json
    .env.example
  docker-compose.yml
  supabase/
    schema.sql
  README.md
```
