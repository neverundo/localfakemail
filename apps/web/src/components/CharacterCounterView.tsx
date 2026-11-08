"use client";

import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  clampPreviewLength,
  PREVIEW_LENGTH_MAX,
  PREVIEW_LENGTH_MIN,
  truncateWithEllipsis,
} from "@/lib/character-counter";
import {
  getRememberedPreviewLength,
  setRememberedPreviewLength,
} from "@/lib/character-counter-memory";

type CopyState = "idle" | "copied" | "error";

function copyButtonLabel(copyState: CopyState): string {
  if (copyState === "copied") return "Copied";
  if (copyState === "error") return "Select & copy manually";
  return "Copy";
}

function copyButtonClass(copyState: CopyState): string {
  if (copyState === "copied") {
    return "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--unread)]";
  }
  if (copyState === "error") {
    return "border-[var(--danger)] text-[var(--danger)]";
  }
  return "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--unread)]";
}

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform);
}

export function CharacterCounterView() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [previewLength, setPreviewLength] = useState(getRememberedPreviewLength);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const modKey = isMacPlatform() ? "⌘" : "Ctrl";

  const n = clampPreviewLength(previewLength);
  const preview = truncateWithEllipsis(text, n);
  const totalCharacters = text.length;
  const isTruncated = text.length > n;

  function updatePreviewLength(raw: number) {
    const next = clampPreviewLength(raw);
    setRememberedPreviewLength(next);
    setPreviewLength(next);
  }

  function clearText() {
    setText("");
    setCopyState("idle");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selectPreview() {
    const el = previewRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }

  async function copyPreview() {
    if (!preview) return;

    try {
      await navigator.clipboard.writeText(preview);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      selectPreview();
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2200);
    }
  }

  return (
    <AppShell>
      <div className="grid h-[calc(100vh-8.5rem)] min-h-[520px] overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--bg-panel)]/85 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[320px_1fr]">
          <aside className="flex min-h-0 flex-col border-b border-[var(--line)] lg:border-r lg:border-b-0">
            <div className="border-b border-[var(--line)] px-4 py-4">
              <p className="text-sm font-medium">Character Counter</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Paste text to count characters instantly. Set N to preview a truncated slice.
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/60 px-4 py-4">
                <p className="text-xs tracking-wide text-[var(--text-muted)] uppercase">
                  Total characters
                </p>
                <p className="mt-2 font-[family-name:var(--font-mono)] text-3xl tracking-tight text-[var(--unread)]">
                  {totalCharacters.toLocaleString()}
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label
                    htmlFor="preview-length"
                    className="text-xs tracking-wide text-[var(--text-muted)] uppercase"
                  >
                    Show only N characters
                  </label>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--unread)]">
                    {n}
                  </span>
                </div>
                <input
                  id="preview-length-range"
                  type="range"
                  min={PREVIEW_LENGTH_MIN}
                  max={500}
                  value={Math.min(n, 500)}
                  onChange={(event) => updatePreviewLength(Number(event.target.value))}
                  className="w-full accent-[var(--accent)]"
                  aria-label="Preview length slider"
                />
                <input
                  id="preview-length"
                  type="number"
                  min={PREVIEW_LENGTH_MIN}
                  max={PREVIEW_LENGTH_MAX}
                  value={n}
                  onChange={(event) =>
                    updatePreviewLength(Number(event.target.value) || PREVIEW_LENGTH_MIN)
                  }
                  className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
                />
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {isTruncated
                    ? `Preview shows ${n} characters + “…”`
                    : "Use keyboard arrows to adjust N."}
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--line)] p-4">
              <button
                type="button"
                onClick={clearText}
                disabled={!text}
                className="w-full rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col bg-[var(--bg-elevated)]/40">
            <div className="flex min-h-0 flex-1 flex-col border-b border-[var(--line)]">
              <div className="border-b border-[var(--line)] px-4 py-3">
                <p className="text-sm font-medium">Input</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Paste or type any string, text, or number.
                </p>
              </div>
              <div className="min-h-0 flex-1 p-3">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    setCopyState("idle");
                  }}
                  spellCheck={false}
                  placeholder="Paste text here…"
                  aria-label="Text to count"
                  className="h-full w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--bg-panel)] p-4 font-[family-name:var(--font-mono)] text-sm leading-relaxed text-[var(--text)] outline-none transition selection:bg-[rgba(61,155,110,0.35)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Preview</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {preview
                      ? `${preview.length.toLocaleString()} chars in output`
                      : "Empty until you paste text"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={selectPreview}
                    disabled={!preview}
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Select all{" "}
                    <span className="ml-1.5 hidden font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-muted)] sm:inline">
                      {modKey}A
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyPreview()}
                    disabled={!preview}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${copyButtonClass(copyState)}`}
                  >
                    {copyButtonLabel(copyState)}
                    {copyState === "idle" ? (
                      <span className="ml-1.5 hidden font-[family-name:var(--font-mono)] text-[10px] sm:inline">
                        {modKey}C
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 p-3">
                <textarea
                  ref={previewRef}
                  readOnly
                  value={preview}
                  onFocus={(event) => event.currentTarget.select()}
                  spellCheck={false}
                  aria-label="Truncated preview"
                  className="h-full w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--bg-panel)] p-4 font-[family-name:var(--font-mono)] text-sm leading-relaxed text-[var(--text)] outline-none transition selection:bg-[rgba(61,155,110,0.35)] focus:border-[var(--accent)]"
                />
              </div>

              <div className="border-t border-[var(--line)] px-4 py-2.5 text-xs text-[var(--text-muted)]">
                Tip: copy the truncated preview with{" "}
                <kbd className="rounded border border-[var(--line)] bg-[var(--bg-panel)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--text)]">
                  {modKey}C
                </kbd>{" "}
                after selecting it — or use the buttons above.
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
