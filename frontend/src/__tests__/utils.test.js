import { describe, it, expect } from "vitest";
import { formatFileSize, shuffle } from "../utils.js";

// ── formatFileSize ────────────────────────────────────────────────────────────

describe("formatFileSize", () => {
  it("zeigt Bytes unter 1 MB als KB an", () => {
    expect(formatFileSize(512 * 1024)).toBe("512 KB");
  });

  it("rundet auf ganze KB", () => {
    expect(formatFileSize(1500)).toBe("1 KB");
  });

  it("zeigt Werte >= 1 MB als MB an", () => {
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });

  it("zeigt exakt 1 MB korrekt an", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });
});

// ── shuffle ───────────────────────────────────────────────────────────────────

describe("shuffle", () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("ändert das Original-Array nicht", () => {
    const copy = [...original];
    shuffle(original);
    expect(original).toEqual(copy);
  });

  it("behält alle Elemente (keine Verluste, keine Duplikate)", () => {
    const result = shuffle(original);
    expect(result).toHaveLength(original.length);
    expect(result.sort()).toEqual([...original].sort());
  });

  it("gibt ein Array zurück", () => {
    expect(Array.isArray(shuffle([]))).toBe(true);
  });

  it("verändert die Reihenfolge (statistisch – läuft 10x)", () => {
    // Bei 10 Elementen ist die Wahrscheinlichkeit, dass alle 10 Shuffles
    // identisch sind, verschwindend gering.
    const results = Array.from({ length: 10 }, () => shuffle(original).join(","));
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThan(1);
  });
});
