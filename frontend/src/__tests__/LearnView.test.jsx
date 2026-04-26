import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import {
  MultipleChoiceCard,
  AufgabeCard,
  ScoreCard,
} from "../LearnView.jsx";

// ── Test-Fixtures ─────────────────────────────────────────────────────────────

const mcActivity = {
  id: "mc1",
  type: "multiple_choice",
  content: {
    question: "Was ist 2 + 2?",
    options: ["3", "4", "5", "6"],
    correct_index: 1,
    explanation: "2 + 2 = 4, weil Addition.",
  },
};

const aufgabeActivity = {
  id: "a1",
  type: "aufgabe",
  content: {
    question: "Erkläre das Pythagoreische Theorem.",
    model_answer: "a² + b² = c², wobei c die Hypotenuse ist.",
  },
};

// ── MultipleChoiceCard ────────────────────────────────────────────────────────

describe("MultipleChoiceCard", () => {
  it("zeigt die Frage und alle 4 Antwortoptionen", () => {
    render(<MultipleChoiceCard activity={mcActivity} onAnswer={vi.fn()} />);

    expect(screen.getByText("Was ist 2 + 2?")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("zeigt vor der Auswahl keine Erklärung", () => {
    render(<MultipleChoiceCard activity={mcActivity} onAnswer={vi.fn()} />);
    expect(screen.queryByText(/2 \+ 2 = 4/)).not.toBeInTheDocument();
  });

  it("zeigt nach richtiger Antwort die Erklärung und '✓ Richtig!'", async () => {
    const user = userEvent.setup();
    render(<MultipleChoiceCard activity={mcActivity} onAnswer={vi.fn()} />);

    // Option B (Index 1) = korrekte Antwort
    await user.click(screen.getByText("4"));

    expect(screen.getByText("✓ Richtig!")).toBeInTheDocument();
    expect(screen.getByText("2 + 2 = 4, weil Addition.")).toBeInTheDocument();
  });

  it("zeigt nach falscher Antwort '✗ Leider falsch.'", async () => {
    const user = userEvent.setup();
    render(<MultipleChoiceCard activity={mcActivity} onAnswer={vi.fn()} />);

    await user.click(screen.getByText("3")); // falsche Antwort
    expect(screen.getByText("✗ Leider falsch.")).toBeInTheDocument();
  });

  it("ruft onAnswer(true) nach richtiger Antwort und Weiter-Klick auf", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<MultipleChoiceCard activity={mcActivity} onAnswer={onAnswer} />);

    await user.click(screen.getByText("4")); // richtige Antwort
    await user.click(screen.getByText("Weiter →"));

    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it("ruft onAnswer(false) nach falscher Antwort und Weiter-Klick auf", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<MultipleChoiceCard activity={mcActivity} onAnswer={onAnswer} />);

    await user.click(screen.getByText("3")); // falsche Antwort
    await user.click(screen.getByText("Weiter →"));

    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it("ignoriert weitere Klicks nach erster Auswahl", async () => {
    const user = userEvent.setup();
    render(<MultipleChoiceCard activity={mcActivity} onAnswer={vi.fn()} />);

    await user.click(screen.getByText("3")); // erste Auswahl (falsch)
    // Zweiter Klick auf richtige Antwort – soll ignoriert werden
    await user.click(screen.getByText("4"));

    // Immer noch '✗ Leider falsch.' weil erste Auswahl zählt
    expect(screen.getByText("✗ Leider falsch.")).toBeInTheDocument();
  });
});

// ── AufgabeCard ───────────────────────────────────────────────────────────────

describe("AufgabeCard", () => {
  it("zeigt die Aufgabe und den Reveal-Button", () => {
    render(<AufgabeCard activity={aufgabeActivity} onAnswer={vi.fn()} />);

    expect(screen.getByText("Erkläre das Pythagoreische Theorem.")).toBeInTheDocument();
    expect(screen.getByText("Musterlösung anzeigen")).toBeInTheDocument();
  });

  it("zeigt die Musterlösung zunächst nicht an", () => {
    render(<AufgabeCard activity={aufgabeActivity} onAnswer={vi.fn()} />);
    expect(screen.queryByText(/a² \+ b²/)).not.toBeInTheDocument();
  });

  it("zeigt Musterlösung nach Klick auf 'Musterlösung anzeigen'", async () => {
    const user = userEvent.setup();
    render(<AufgabeCard activity={aufgabeActivity} onAnswer={vi.fn()} />);

    await user.click(screen.getByText("Musterlösung anzeigen"));

    expect(screen.getByText("a² + b² = c², wobei c die Hypotenuse ist.")).toBeInTheDocument();
    expect(screen.getByText("✓ Ja, kannte ich")).toBeInTheDocument();
    expect(screen.getByText("✗ Noch nicht")).toBeInTheDocument();
  });

  it("ruft onAnswer(true) auf wenn 'Ja, kannte ich' geklickt wird", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<AufgabeCard activity={aufgabeActivity} onAnswer={onAnswer} />);

    await user.click(screen.getByText("Musterlösung anzeigen"));
    await user.click(screen.getByText("✓ Ja, kannte ich"));

    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it("ruft onAnswer(false) auf wenn 'Noch nicht' geklickt wird", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<AufgabeCard activity={aufgabeActivity} onAnswer={onAnswer} />);

    await user.click(screen.getByText("Musterlösung anzeigen"));
    await user.click(screen.getByText("✗ Noch nicht"));

    expect(onAnswer).toHaveBeenCalledWith(false);
  });
});

// ── ScoreCard ─────────────────────────────────────────────────────────────────

describe("ScoreCard", () => {
  const activities = [
    { id: "mc1", type: "multiple_choice" },
    { id: "mc2", type: "multiple_choice" },
    { id: "a1", type: "aufgabe" },
  ];

  it("zeigt den prozentualen Score an", () => {
    // 2 von 3 richtig → 67 %
    const answers = [
      { id: "mc1", correct: true },
      { id: "mc2", correct: false },
      { id: "a1", correct: true },
    ];
    render(
      <ScoreCard
        activities={activities}
        answers={answers}
        onRestart={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText("67 %")).toBeInTheDocument();
  });

  it("zeigt 100 % bei vollem Erfolg", () => {
    const answers = [
      { id: "mc1", correct: true },
      { id: "mc2", correct: true },
      { id: "a1", correct: true },
    ];
    render(
      <ScoreCard
        activities={activities}
        answers={answers}
        onRestart={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText("100 %")).toBeInTheDocument();
  });

  it("zeigt korrekte MC-Statistik", () => {
    const answers = [
      { id: "mc1", correct: true },
      { id: "mc2", correct: false },
      { id: "a1", correct: true },
    ];
    render(
      <ScoreCard
        activities={activities}
        answers={answers}
        onRestart={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText("1 / 2 richtig")).toBeInTheDocument();
    expect(screen.getByText("1 / 1 als bekannt markiert")).toBeInTheDocument();
  });

  it("ruft onRestart auf wenn 'Noch einmal üben' geklickt wird", async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();
    render(
      <ScoreCard
        activities={activities}
        answers={[]}
        onRestart={onRestart}
        onBack={vi.fn()}
      />,
    );
    await user.click(screen.getByText("Noch einmal üben"));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it("ruft onBack auf wenn 'Zurück zu den Paketen' geklickt wird", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <ScoreCard
        activities={activities}
        answers={[]}
        onRestart={vi.fn()}
        onBack={onBack}
      />,
    );
    await user.click(screen.getByText("Zurück zu den Paketen"));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
