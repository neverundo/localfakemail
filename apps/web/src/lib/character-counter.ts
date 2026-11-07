export const PREVIEW_LENGTH_MIN = 1;
export const PREVIEW_LENGTH_MAX = 10_000;
export const DEFAULT_PREVIEW_LENGTH = 50;

export function clampPreviewLength(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_PREVIEW_LENGTH;
  return Math.min(PREVIEW_LENGTH_MAX, Math.max(PREVIEW_LENGTH_MIN, Math.trunc(n)));
}

export function truncateWithEllipsis(text: string, n: number): string {
  if (!text) return "";
  const length = clampPreviewLength(n);
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}
