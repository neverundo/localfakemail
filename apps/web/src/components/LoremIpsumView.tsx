"use client";

import { useCallback, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  clampLoremCount,
  countLoremStats,
  generateLorem,
  type LoremUnit,
} from "@/lib/lorem";

type CopyState = "idle" | "copied" | "error";

const UNITS: { value: LoremUnit; label: string; hint: string }[] = [
  { value: "paragraphs", label: "Paragraphs", hint: "1–20" },
  { value: "sentences", label: "Sentences", hint: "1–50" },
  { value: "words", label: "Words", hint: "1–500" },
  { value: "list", label: "List", hint: "1–30" },
];

const DEFAULT_COUNTS: Record<LoremUnit, number> = {
  paragraphs: 3,
  sentences: 5,
  words: 100,
  list: 5,
};

function getCountMax(unit: LoremUnit): number {
  switch (unit) {
    case "paragraphs":
      return 20;
    case "sentences":
      return 50;
    case "words":
      return 500;
    case "list":
      return 30;
    default:
      return 20;
  }
}

function copyButtonLabel(copyState: CopyState): string {
  if (copyState === "copied") return "Copied";
  if (copyState === "error") return "Select & copy manually";
  return "Copy";
}

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform);
}

export function LoremIpsumView() {
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const [unit, setUnit] = useState<LoremUnit>("paragraphs");
  const [count, setCount] = useState(DEFAULT_COUNTS.paragraphs);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [text, setText] = useState(() =>
    generateLorem({
      unit: "paragraphs",
      count: DEFAULT_COUNTS.paragraphs,
      startWithLorem: true,
    }),
  );
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const modKey = isMacPlatform() ? "⌘" : "Ctrl";

  const regenerate = useCallback(
    (opts?: { select?: boolean }) => {
      const next = generateLorem({
        unit,
        count: clampLoremCount(unit, count),
        startWithLorem: unit === "list" ? false : startWithLorem,
      });
      setText(next);
      setCopyState("idle");

      if (opts?.select !== false) {
        requestAnimationFrame(() => {
          const el = outputRef.current;
          if (!el) return;
          el.focus();
          el.select();
        });
      }
    },
    [unit, count, startWithLorem],
  );

  function handleUnitChange(nextUnit: LoremUnit) {
    setUnit(nextUnit);
    setCount(DEFAULT_COUNTS[nextUnit]);
  }

  function selectAll() {
    const el = outputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }

  async function copyText() {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      selectAll();
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2200);
    }
  }

  const stats = countLoremStats(text);

  return (
    <AppShell>
      <div className="grid h-[calc(100vh-8.5rem)] min-h-[520px] overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--bg-panel)]/85 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[320px_1fr]">
          <aside className="flex min-h-0 flex-col border-b border-[var(--line)] lg:border-r lg:border-b-0">
            <div className="border-b border-[var(--line)] px-4 py-4">
              <p className="text-sm font-medium">Generator</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Runs fully offline in the browser — no API calls.
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
              <fieldset className="space-y-2">
                <legend className="text-xs tracking-wide text-[var(--text-muted)] uppercase">
                  Output type
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {UNITS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleUnitChange(item.value)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        unit === item.value
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--line)] hover:border-[var(--accent)]/60"
                      }`}
                    >
                      <span
                        className={`block text-sm ${
                          unit === item.value ? "text-[var(--unread)]" : "text-[var(--text)]"
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                        {item.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label htmlFor="lorem-count" className="text-xs tracking-wide text-[var(--text-muted)] uppercase">
                    Count
                  </label>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--unread)]">
                    {clampLoremCount(unit, count)}
                  </span>
                </div>
                <input
                  id="lorem-count"
                  type="range"
                  min={1}
                  max={getCountMax(unit)}
                  value={count}
                  onChange={(event) => setCount(Number(event.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
                <input
                  type="number"
                  min={1}
                  max={getCountMax(unit)}
                  value={count}
                  onChange={(event) =>
                    setCount(clampLoremCount(unit, Number(event.target.value) || 1))
                  }
                  className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
                />
              </div>

              {unit !== "list" ? (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--line)] px-3 py-3 transition hover:border-[var(--accent)]/60">
                  <input
                    type="checkbox"
                    checked={startWithLorem}
                    onChange={(event) => setStartWithLorem(event.target.checked)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="block text-sm">Start with &ldquo;Lorem ipsum&rdquo;</span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      Classic opening for the first block.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>

            <div className="border-t border-[var(--line)] p-4">
              <button
                type="button"
                onClick={() => regenerate()}
                className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[#04140c] transition hover:brightness-110"
              >
                Generate
              </button>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col bg-[var(--bg-elevated)]/40">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Output</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {stats.words.toLocaleString()} words · {stats.characters.toLocaleString()} chars
                  {unit === "list" ? ` · ${stats.lines} lines` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
                >
                  Select all
                  <span className="ml-1.5 hidden font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-muted)] sm:inline">
                    {modKey}A
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void copyText()}
                  disabled={!text}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    copyState === "copied"
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--unread)]"
                      : copyState === "error"
                        ? "border-[var(--danger)] text-[var(--danger)]"
                        : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--unread)]"
                  }`}
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
                ref={outputRef}
                readOnly
                value={text}
                onFocus={(event) => event.currentTarget.select()}
                spellCheck={false}
                aria-label="Generated lorem ipsum text"
                className="h-full w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--bg-panel)] p-4 font-[family-name:var(--font-mono)] text-sm leading-relaxed text-[var(--text)] outline-none transition selection:bg-[rgba(61,155,110,0.35)] focus:border-[var(--accent)]"
              />
            </div>

            <div className="border-t border-[var(--line)] px-4 py-2.5 text-xs text-[var(--text-muted)]">
              Tip: click the output to select everything, then press{" "}
              <kbd className="rounded border border-[var(--line)] bg-[var(--bg-panel)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--text)]">
                {modKey}C
              </kbd>{" "}
              — or use the buttons above.
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
