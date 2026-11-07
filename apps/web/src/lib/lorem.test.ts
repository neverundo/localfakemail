import { describe, expect, it } from "vitest";
import { clampLoremCount, countLoremStats, generateLorem } from "./lorem";

describe("clampLoremCount", () => {
  it("clamps per unit", () => {
    expect(clampLoremCount("paragraphs", 0)).toBe(1);
    expect(clampLoremCount("paragraphs", 99)).toBe(20);
    expect(clampLoremCount("words", 12.6)).toBe(13);
    expect(clampLoremCount("list", -3)).toBe(1);
  });
});

describe("generateLorem", () => {
  it("generates paragraphs with classic opening", () => {
    const text = generateLorem({ unit: "paragraphs", count: 2, startWithLorem: true });
    expect(text.startsWith("Lorem ipsum dolor sit amet")).toBe(true);
    expect(text.split("\n\n")).toHaveLength(2);
  });

  it("generates sentences without opening", () => {
    const text = generateLorem({ unit: "sentences", count: 3, startWithLorem: false });
    expect(text.split(/(?<=[.?])\s+/).length).toBeGreaterThanOrEqual(3);
  });

  it("generates sentences with opening", () => {
    const text = generateLorem({ unit: "sentences", count: 2, startWithLorem: true });
    expect(text.startsWith("Lorem ipsum dolor sit amet")).toBe(true);
  });

  it("generates words with and without lorem prefix", () => {
    const withPrefix = generateLorem({ unit: "words", count: 8, startWithLorem: true });
    expect(withPrefix.startsWith("lorem ipsum dolor sit amet")).toBe(true);
    expect(withPrefix.split(/\s+/)).toHaveLength(8);

    const plain = generateLorem({ unit: "words", count: 3, startWithLorem: false });
    expect(plain.split(/\s+/)).toHaveLength(3);
  });

  it("generates a markdown-ish list", () => {
    const text = generateLorem({ unit: "list", count: 3, startWithLorem: false });
    const lines = text.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines.every((line) => line.startsWith("- "))).toBe(true);
  });
});

describe("countLoremStats", () => {
  it("handles empty and populated text", () => {
    expect(countLoremStats("   ")).toEqual({ words: 0, characters: 0, lines: 0 });
    expect(countLoremStats("one two\nthree")).toEqual({
      words: 3,
      characters: 13,
      lines: 2,
    });
  });
});
