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
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
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
  docker-compose.yml
  supabase/
    schema.sql
  README.md
```
