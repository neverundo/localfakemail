import { describe, expect, it } from "vitest";
import {
  clampPreviewLength,
  DEFAULT_PREVIEW_LENGTH,
  PREVIEW_LENGTH_MAX,
  PREVIEW_LENGTH_MIN,
  truncateWithEllipsis,
} from "./character-counter";

describe("clampPreviewLength", () => {
  it("clamps to bounds and defaults non-finite values", () => {
    expect(clampPreviewLength(Number.NaN)).toBe(DEFAULT_PREVIEW_LENGTH);
    expect(clampPreviewLength(-10)).toBe(PREVIEW_LENGTH_MIN);
    expect(clampPreviewLength(PREVIEW_LENGTH_MAX + 50)).toBe(PREVIEW_LENGTH_MAX);
    expect(clampPreviewLength(42.9)).toBe(42);
  });
});

describe("truncateWithEllipsis", () => {
  it("returns empty for empty input", () => {
    expect(truncateWithEllipsis("", 10)).toBe("");
  });

  it("keeps short text intact", () => {
    expect(truncateWithEllipsis("hello", 10)).toBe("hello");
  });

  it("truncates long text with ellipsis", () => {
    expect(truncateWithEllipsis("abcdefghij", 5)).toBe("abcde...");
  });
});
