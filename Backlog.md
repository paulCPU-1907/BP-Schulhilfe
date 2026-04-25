# Backlog

## Offene Tasks

- [ ] Supabase Secret Key rotieren und `backend/.env` auf den neuen Wert aktualisieren, da der bisherige Key im Chat geteilt wurde.
- [ ] OpenAI API Key rotieren und `backend/.env` auf den neuen Wert aktualisieren, da der bisherige Key im Chat geteilt wurde.
- [ ] Fachliches Domänenmodell für `Unterrichtsfach`, `Lernpaket`, `Lernmaterial`, `Lernziel` und `Lernaktivität` ausarbeiten.
- [ ] Datenmodell und Supabase-Schema für `Unterrichtsfach` und `Lernpaket` entwerfen.
- [ ] Beziehung definieren: Ein `Unterrichtsfach` kann mehrere `Lernpakete` enthalten.
- [ ] Beziehung definieren: Ein `Lernpaket` besteht aus einem oder mehreren hochgeladenen Lernmaterialien.
- [ ] Logik entwerfen, mit der Inhalte aus früheren `Lernpaketen` desselben Unterrichtsfachs gezielt zur Wiederholung einbezogen werden.
- [ ] Lernmodus über `Lernaktivitäten` konzipieren, mit mindestens diesen Typen: `multiple_choice`, `aufgabe`, `textaufgabe`, `chat_diskussion`.
- [ ] User Journey aus Schülersicht definieren: Material sammeln, Lernpaket erzeugen, wiederholen, Prüfung vorbereiten.
- [ ] Produktentscheidung treffen, ob zusätzlich `Thema` oder `Kompetenz` als eigene Entität eingeführt werden soll, um paketübergreifende Wiederholung sauber zu steuern.
