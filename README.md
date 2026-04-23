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

Mit Docker:

```bash
docker compose up --build
```

Danach sind die Services erreichbar:

- Frontend: `http://localhost:5173`
- Backend Healthcheck: `http://localhost:3000/health`

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
  README.md
```
