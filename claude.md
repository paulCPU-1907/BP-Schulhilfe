# Claude Context

## Bitte zuerst lesen

Diese Datei ist der zentrale Einstiegspunkt fuer die Arbeit an diesem Repository.
Sie soll fruehzeitig gelesen werden, bevor groessere Analysen, Implementierungen oder Architekturentscheidungen erfolgen.

## Projektziel

Dieses Projekt ist eine Lernhilfe-/Schulhilfe-Anwendung mit Fokus auf der Analyse von Lernmaterialien.
Nutzer laden PDFs oder Bilder hoch.
Das System extrahiert den Inhalt, erstellt eine kurze Zusammenfassung und erzeugt konkrete Lernaufgaben.

Der aktuelle Stand ist ein pragmatisches MVP mit Debug- und Integrationsfokus.

## Zentrale Use Cases

- Schueler laden ein oder mehrere PDFs hoch.
- Schueler laden Fotos oder Screenshots von Aufgaben, Arbeitsblaettern oder Mitschriften hoch.
- Das System verarbeitet jede Datei einzeln.
- Das System liefert pro Datei:
  - erkannten Text (`ocrText`)
  - eine kurze Zusammenfassung (`summary`)
  - konkrete Lernaufgaben (`tasks`)
- Ergebnisse werden fuer Nachvollziehbarkeit und spaetere Auswertung in Supabase gespeichert.

## Aktueller Funktionsumfang

- Multi-Upload im Frontend fuer PDF- und Bilddateien
- Backend-Endpoint `/api/analyze` fuer Dateianalyse
- OpenAI-Anbindung ueber die Responses API
- Supabase-Anbindung fuer Persistenz von Analyseergebnissen
- Healthchecks fuer Backend, OpenAI und Supabase
- Demo-Fallback, wenn OpenAI nicht konfiguriert ist

## Produkt- und UX-Annahmen

- Das Produkt ist aktuell ein MVP und Debug-Build, noch keine ausgereifte Endnutzeranwendung.
- Transparenz im Analysefluss ist wichtig.
- Fehler sollen sichtbar und nachvollziehbar sein.
- Die Architektur ist bewusst einfach gehalten, um Integrationen schnell pruefen zu koennen.

## Architekturueberblick

Der aktuelle Request-Flow ist:

Browser -> Frontend -> Backend -> OpenAI / Supabase

Komponenten:

- `frontend/`
  - React + Vite
  - Datei-Upload
  - Anzeige von Status, Fehlern und Analyseergebnissen
- `backend/`
  - Node.js + Express
  - Validierung der Uploads
  - Aufruf von OpenAI
  - Persistenz nach Supabase
- `supabase/`
  - SQL-Schema fuer `analysis_results`

## Wichtige Architekturentscheidungen

- Klare Trennung zwischen Frontend und Backend
  - API-Keys bleiben serverseitig
  - OpenAI und Supabase werden nicht direkt aus dem Frontend angesprochen

- Verarbeitung pro Datei
  - Jede Datei erzeugt ein eigenes Ergebnisobjekt
  - Fehler einzelner Dateien sollen nicht den gesamten Request unbrauchbar machen

- Strukturierte KI-Antworten
  - OpenAI wird mit JSON-Schema verwendet
  - Das reduziert Parsing-Unsicherheit im Frontend und Backend

- Persistenz im Backend
  - Analyseergebnisse werden serverseitig in Supabase gespeichert
  - Das vereinfacht Kontrolle, Logging und spaetere Erweiterungen

- Einfache lokale Betriebsfaehigkeit
  - Projekt kann lokal mit Docker oder getrennt pro Service gestartet werden
  - `.env`-basierte Konfiguration fuer externe Dienste

## Wichtige Dateien

- `README.md`
  - Projektstart und Grundsetup
- `session.md`
  - Laufende Sitzungsdokumentation
- `Backlog.md`
  - offene Aufgaben und Nacharbeiten
- `backend/src/server.js`
  - zentrale API-Logik
- `backend/src/openai.js`
  - OpenAI-Integration
- `backend/src/supabase.js`
  - Supabase-Integration
- `frontend/src/main.jsx`
  - Haupt-UI und Upload-Flow
- `supabase/schema.sql`
  - Datenbankschema fuer Analyseergebnisse

## Datenmodell

Tabelle `analysis_results`:

- `id`
- `request_id`
- `file_name`
- `status`
- `ocr_text`
- `summary`
- `tasks`
- `error`
- `created_at`

Die Tabelle dient aktuell vor allem:

- zur Verifikation, dass Analysen persistiert werden
- zum Debugging
- als Grundlage fuer spaetere Historie- oder Reporting-Funktionen

## Externe Integrationen

### Supabase

- Wird aktuell serverseitig genutzt
- Konfiguriert ueber `SUPABASE_URL` und `SUPABASE_SECRET_KEY`
- `analysis_results` ist verifiziert und beschreibbar

### OpenAI

- Wird aktuell serverseitig genutzt
- Konfiguriert ueber `OPENAI_API_KEY` und optional `OPENAI_MODEL`
- Responses API wird fuer Bild-/PDF-Analyse und strukturierte JSON-Antworten verwendet
- End-to-End-Test war erfolgreich

## Deployment-Realitaet

- Das Frontend kann statisch auf GitHub Pages deployed werden.
- Das Backend kann nicht auf GitHub Pages laufen, weil es Node.js, Express und serverseitige Secrets braucht.
- Fuer den Online-Betrieb gilt daher:
  - Frontend: GitHub Pages
  - Backend: separate Hosting-Plattform
- Das Frontend muss online eine explizite Backend-URL verwenden, nicht nur den lokalen Vite-Proxy.

## Bekannte Risiken und technische Schulden

- Geteilte Secrets muessen rotiert werden
- Kaum serverseitige Schutzmechanismen gegen grosse oder viele Uploads
- Keine Rate Limits
- Keine Authentifizierung
- Noch keine automatisierten Tests
- Base64-Upload ueber JSON ist fuer groessere Dateien nicht ideal
- Parallelisierung ueber `Promise.all(...)` kann bei vielen Dateien teuer werden

## Leitlinien fuer weitere Arbeit

- Diese Datei zuerst lesen, dann `session.md`, dann die betroffenen Code-Dateien.
- Bestehende Architektur nicht ohne guten Grund verkomplizieren.
- API-Keys und externe Integrationen ausschliesslich serverseitig halten.
- Sicherheits- und Betriebsaspekte bei neuen Features frueh mitdenken.
- Bei groesseren Aenderungen die Doku in `claude.md`, `session.md` und bei Bedarf `Backlog.md` aktualisieren.

## Naechste sinnvolle Ausbaustufen

- Upload-Validierung und serverseitige Dateigroessenlimits verbessern
- Fehlerbehandlung und Logging verfeinern
- Tests fuer Backend-Endpoints und Kernlogik einfuehren
- Historie oder Ergebnisuebersicht auf Basis von Supabase ergaenzen
- UX fuer echte Lernablaeufe statt reinen Debug-Fokus ausbauen
