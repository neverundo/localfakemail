import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PREVIEW_LENGTH,
  PREVIEW_LENGTH_MAX,
  PREVIEW_LENGTH_MIN,
} from "./character-counter";
import {
  getRememberedPreviewLength,
  resetRememberedPreviewLength,
  setRememberedPreviewLength,
} from "./character-counter-memory";

afterEach(() => {
  resetRememberedPreviewLength();
});

describe("character-counter-memory", () => {
  it("starts at the default preview length", () => {
    expect(getRememberedPreviewLength()).toBe(DEFAULT_PREVIEW_LENGTH);
  });

  it("remembers a user-defined preview length", () => {
    setRememberedPreviewLength(42);
    expect(getRememberedPreviewLength()).toBe(42);
  });

  it("clamps values when remembering", () => {
    setRememberedPreviewLength(-5);
    expect(getRememberedPreviewLength()).toBe(PREVIEW_LENGTH_MIN);

    setRememberedPreviewLength(PREVIEW_LENGTH_MAX + 100);
    expect(getRememberedPreviewLength()).toBe(PREVIEW_LENGTH_MAX);
  });

  it("survives across get/set cycles like SPA remounts", () => {
    setRememberedPreviewLength(42);
    expect(getRememberedPreviewLength()).toBe(42);
    expect(getRememberedPreviewLength()).toBe(42);
  });
});
