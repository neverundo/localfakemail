import {
  clampPreviewLength,
  DEFAULT_PREVIEW_LENGTH,
} from "./character-counter";

/** In-memory preference for /counter — survives SPA navigation, resets on full reload. */
let rememberedPreviewLength = DEFAULT_PREVIEW_LENGTH;

export function getRememberedPreviewLength(): number {
  return rememberedPreviewLength;
}

export function setRememberedPreviewLength(n: number): void {
  rememberedPreviewLength = clampPreviewLength(n);
}

/** Test helper: restore the default in-memory value. */
export function resetRememberedPreviewLength(): void {
  rememberedPreviewLength = DEFAULT_PREVIEW_LENGTH;
}
