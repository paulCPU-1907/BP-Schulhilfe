import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { App } from "../main.jsx";

// fetch wird global gemockt; jeder Test konfiguriert seinen eigenen Rückgabewert.
beforeEach(() => {
  global.fetch = vi.fn();
});

function mockFetch(data, ok = true) {
  global.fetch.mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  });
}

// ── SubjectsView – Ladezustand ────────────────────────────────────────────────

describe("SubjectsView – Ladezustand", () => {
  it("zeigt 'Lade Fächer …' während der API-Anfrage läuft", () => {
    global.fetch.mockReturnValue(new Promise(() => {})); // hängt absichtlich
    render(<App />);
    expect(screen.getByText("Lade Fächer …")).toBeInTheDocument();
  });
});

// ── SubjectsView – Leerzustand ────────────────────────────────────────────────

describe("SubjectsView – Leerzustand", () => {
  it("zeigt Hinweis wenn keine Fächer vorhanden sind", async () => {
    mockFetch([]);
    render(<App />);
    await screen.findByText("Noch keine Fächer");
  });
});

// ── SubjectsView – Fächerliste ────────────────────────────────────────────────

describe("SubjectsView – Fächerliste", () => {
  const subjects = [
    { id: "s1", name: "Mathematik", package_count: 3 },
    { id: "s2", name: "Geschichte", package_count: 0 },
  ];

  it("zeigt alle Fächer aus der API an", async () => {
    mockFetch(subjects);
    render(<App />);
    await screen.findByText("Mathematik");
    expect(screen.getByText("Geschichte")).toBeInTheDocument();
  });

  it("zeigt die korrekte Paketanzahl", async () => {
    mockFetch(subjects);
    render(<App />);
    await screen.findByText("3 Lernpakete");
    expect(screen.getByText("0 Lernpakete")).toBeInTheDocument();
  });

  it("zeigt '1 Lernpaket' im Singular", async () => {
    mockFetch([{ id: "s1", name: "Physik", package_count: 1 }]);
    render(<App />);
    await screen.findByText("1 Lernpaket");
  });
});

// ── SubjectsView – Fehlerfall ─────────────────────────────────────────────────

describe("SubjectsView – Fehlerfall", () => {
  it("zeigt Fehlermeldung bei fehlgeschlagener API-Anfrage", async () => {
    mockFetch(null, false /* ok: false */);
    render(<App />);
    await screen.findByText("Fächer konnten nicht geladen werden.");
  });
});

// ── SubjectsView – Fach anlegen ───────────────────────────────────────────────

describe("SubjectsView – Fach anlegen", () => {
  it("öffnet das Formular und legt ein neues Fach an", async () => {
    const user = userEvent.setup();

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // initiales Laden
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ id: "s-new", name: "Chemie", package_count: 0 }),
      }); // POST-Antwort

    render(<App />);
    await screen.findByText("Noch keine Fächer");

    await user.click(screen.getByRole("button", { name: "+ Neues Fach" }));
    await user.type(
      screen.getByPlaceholderText(/Mathematik/),
      "Chemie",
    );
    await user.click(screen.getByRole("button", { name: "Anlegen" }));

    await screen.findByText("Chemie");
  });

  it("sendet POST an /subjects mit korrektem Payload", async () => {
    const user = userEvent.setup();

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ id: "s-new", name: "Biologie", package_count: 0 }),
      });

    render(<App />);
    await screen.findByText("Noch keine Fächer");

    await user.click(screen.getByRole("button", { name: "+ Neues Fach" }));
    await user.type(screen.getByPlaceholderText(/Mathematik/), "Biologie");
    await user.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() => {
      const postCall = global.fetch.mock.calls[1];
      expect(postCall[0]).toMatch(/\/subjects/);
      expect(postCall[1].method).toBe("POST");
      const body = JSON.parse(postCall[1].body);
      expect(body.name).toBe("Biologie");
    });
  });
});
