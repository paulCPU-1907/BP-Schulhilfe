# Architecture Decision Records

Dieses Dokument haelt die wesentlichen Architekturentscheidungen fest – warum etwas so gemacht wurde, nicht nur was.

---

## ADR-001: OpenAI Responses API statt Chat Completions

**Entschieden:** Fruehe Projektphase

**Kontext:** Das System muss PDFs und Bilder direkt analysieren, nicht nur Text.

**Entscheidung:** Verwendung der Responses API (`/v1/responses`), die native `input_image`- und `input_file`-Typen unterstuetzt.

**Gruende:**
- Chat Completions erfordert separaten File-Upload-Schritt ueber die Files API
- Responses API erlaubt direkte Base64-Uebergabe von Bildern und PDFs in einem Request
- JSON-Schema-Output (`text.format.type: "json_schema"`) ist in der Responses API nativ unterstuetzt

**Konsequenz:** Die `openai.js`-Integration ist auf die Responses API zugeschnitten. Bei einem Wechsel zu Chat Completions muesste der gesamte `buildOpenAiFileInput`-Block umgebaut werden.

---

## ADR-002: Base64 ueber JSON statt Multipart-Upload

**Entschieden:** Fruehe Projektphase

**Kontext:** Dateien muessen vom Frontend zum Backend uebertragen werden.

**Entscheidung:** Dateien werden als Base64-String in einem JSON-Payload uebertragen.

**Gruende:**
- Einfacherer Request-Aufbau im Frontend (kein FormData notwendig)
- Backend bleibt bei `express.json()` ohne zusaetzliche Multipart-Middleware
- Passt gut zur OpenAI-Integration, die ohnehin Base64 als Data-URL erwartet

**Konsequenz:**
- Ca. 33 % Overhead durch Base64-Encoding (8 MB Datei → ca. 10.7 MB JSON)
- Frontend-Limit: 8 MB; Backend JSON-Limit: 25 MB (Puffer bewusst einkalkuliert)
- Fuer sehr grosse Dateien oder viele gleichzeitige Uploads nicht ideal

---

## ADR-003: Verarbeitung pro Datei, nicht als Batch

**Entschieden:** Fruehe Projektphase

**Kontext:** Mehrere Dateien werden gleichzeitig hochgeladen.

**Entscheidung:** Jede Datei wird einzeln an OpenAI geschickt (`Promise.all` ueber alle Dateien).

**Gruende:**
- Fehler einer Datei sollen nicht den gesamten Request unbrauchbar machen
- Ergebnisstruktur ist klar: ein Objekt pro Datei
- Einfachere Fehlerbehandlung und Nachvollziehbarkeit

**Konsequenz:** Bei vielen Dateien entstehen viele parallele OpenAI-Requests. Das kann teuer und langsam werden. Spaetere Ausbaustufe: sequenzielle Verarbeitung oder serverseitige Queue.

---

## ADR-004: Frontend auf GitHub Pages, Backend separat

**Entschieden:** Projektstart

**Kontext:** Kostenguenstiges Hosting fuer ein MVP.

**Entscheidung:** Statisches Frontend auf GitHub Pages, Backend auf einer separaten Plattform (z.B. Render, Railway, Fly.io).

**Gruende:**
- GitHub Pages ist kostenlos und gut in den Workflow integriert
- Das Backend benoetigt Node.js, Environment Variables und serverseitige Secrets – das kann GitHub Pages nicht
- API-Keys (`OPENAI_API_KEY`, `SUPABASE_SECRET_KEY`) duerfen nie im Frontend-Build landen

**Konsequenz:**
- `VITE_API_BASE_URL` muss im GitHub-Actions-Deploy gesetzt werden
- Lokale Entwicklung nutzt den Vite-Dev-Proxy (`VITE_BACKEND_URL`) – zwei unterschiedliche Env-Variablen

---

## ADR-005: JSON-Schema fuer strukturierte KI-Antworten

**Entschieden:** Fruehe Projektphase

**Kontext:** Die KI-Antwort muss vom Frontend zuverlaessig geparst werden.

**Entscheidung:** OpenAI wird mit `strict: true` und einem expliziten JSON-Schema aufgerufen. Die Antwort enthaelt immer `ocrText`, `summary` und `tasks`.

**Gruende:**
- Kein fragiles Regex-Parsing auf freiem Text
- Validierung durch OpenAI serverseitig, nicht manuell im Backend
- Frontend kann direkt auf `result.ocrText`, `result.summary`, `result.tasks` zugreifen

**Konsequenz:** Das Schema muss bei Erweiterungen (z.B. neue Felder) in `openai.js` angepasst werden. `additionalProperties: false` verhindert unerwartete Felder in der Antwort.

---

## ADR-006: Demo-Fallback ohne OpenAI-Key

**Entschieden:** Fruehe Projektphase

**Kontext:** Entwicklung und lokales Testen ohne echten OpenAI-Account oder API-Kosten.

**Entscheidung:** Wenn `OPENAI_API_KEY` nicht gesetzt ist, simuliert das Backend OCR und KI-Analyse mit festen Demo-Texten.

**Gruende:**
- Frontend- und Integrationsentwicklung ohne API-Kosten moeglich
- Demo-Modus macht Systemgrenzen sichtbar ohne echte Daten

**Konsequenz:** Demo-Ergebnisse sind statisch. Bei Weiterentwicklung der Antwortstruktur muss der Demo-Pfad mitgepflegt werden.
