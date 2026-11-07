"use client";

import { useCallback, useEffect, useState } from "react";
import type { EmailDetail, EmailListItem } from "@/lib/types";
import { displayAddress, formatBytes, formatRelativeTime } from "@/lib/types";
import { AppShell } from "@/components/AppShell";

type PreviewTab = "html" | "text" | "raw";
type PreviewViewport = "desktop" | "tablet" | "smartphone";

const VIEWPORT_WIDTHS: Record<PreviewViewport, string> = {
  desktop: "100%",
  tablet: "768px",
  smartphone: "375px",
};

const VIEWPORT_OPTIONS: { id: PreviewViewport; label: string; icon: string }[] = [
  { id: "desktop", label: "Desktop", icon: "/icons/desktop.svg" },
  { id: "tablet", label: "Tablet", icon: "/icons/tablet.svg" },
  { id: "smartphone", label: "Smartphone", icon: "/icons/smartphone.svg" },
];

export function InboxView() {
  const [emails, setEmails] = useState<EmailListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmailDetail | null>(null);
  const [tab, setTab] = useState<PreviewTab>("html");
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmails = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingList(true);
    try {
      const res = await fetch("/api/emails", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load emails");
      const data = (await res.json()) as { emails: EmailListItem[] };
      setEmails(data.emails);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load emails");
    } finally {
      if (!opts?.silent) setLoadingList(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/emails/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load message");
      const data = (await res.json()) as { email: EmailDetail };
      setDetail(data.email);
      setTab(data.email.previewHtml ? "html" : data.email.textBody ? "text" : "raw");
      setEmails((prev) =>
        prev.map((email) =>
          email.id === id
            ? { ...email, readAt: data.email.readAt ?? new Date().toISOString() }
            : email,
        ),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load message");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadEmails();
    const timer = window.setInterval(() => {
      void loadEmails({ silent: true });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [loadEmails]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function deleteSelected() {
    if (!selectedId) return;
    const res = await fetch(`/api/emails/${selectedId}`, { method: "DELETE" });
    if (!res.ok) return;
    setSelectedId(null);
    setDetail(null);
    await loadEmails({ silent: true });
  }

  async function clearInbox() {
    if (!emails.length) return;
    if (!window.confirm("Delete all captured emails?")) return;
    const res = await fetch("/api/emails", { method: "DELETE" });
    if (!res.ok) return;
    setSelectedId(null);
    setDetail(null);
    await loadEmails({ silent: true });
  }

  return (
    <AppShell>
      <div className="grid h-[calc(100vh-8.5rem)] min-h-[520px] overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--bg-panel)]/85 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="grid min-h-0 grid-cols-1 md:grid-cols-[340px_1fr]">
          <aside className="flex min-h-0 flex-col border-b border-[var(--line)] md:border-r md:border-b-0">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Inbox</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {emails.length} message{emails.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void loadEmails()}
                  className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void clearInbox()}
                  className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingList && !emails.length ? (
                <p className="px-4 py-8 text-sm text-[var(--text-muted)]">Loading…</p>
              ) : null}
              {!loadingList && !emails.length ? (
                <div className="fade-up px-4 py-10 text-center">
                  <p className="text-sm font-medium">No emails yet</p>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                    Point Laravel SMTP at{" "}
                    <code className="font-[family-name:var(--font-mono)] text-[var(--unread)]">
                      127.0.0.1:1025
                    </code>{" "}
                    and generate credentials in Settings.
                  </p>
                </div>
              ) : null}
              {emails.map((email) => {
                const active = email.id === selectedId;
                const unread = !email.readAt;
                return (
                  <button
                    key={email.id}
                    type="button"
                    onClick={() => setSelectedId(email.id)}
                    className={`fade-up block w-full border-b border-[var(--line)] px-4 py-3 text-left transition ${
                      active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {unread ? (
                        <span className="unread-dot inline-block h-2 w-2 rounded-full bg-[var(--unread)]" />
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-transparent" />
                      )}
                      <span
                        className={`truncate text-sm ${unread ? "font-semibold" : "font-medium"}`}
                      >
                        {displayAddress(email.from)}
                      </span>
                      <span className="ml-auto shrink-0 text-[11px] text-[var(--text-muted)]">
                        {formatRelativeTime(email.createdAt)}
                      </span>
                    </div>
                    <p className="truncate pl-4 text-sm text-[var(--text)]">{email.subject}</p>
                    <div className="mt-1 flex gap-2 pl-4 text-[11px] text-[var(--text-muted)]">
                      <span>{formatBytes(email.size)}</span>
                      {email.attachmentCount > 0 ? (
                        <span>
                          {email.attachmentCount} attachment
                          {email.attachmentCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col bg-[var(--bg-elevated)]/40">
            {!selectedId ? (
              <div className="flex flex-1 items-center justify-center px-6 text-center">
                <div>
                  <p className="text-lg font-medium">Select a message</p>
                  <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
                    HTML renders in a sandboxed preview. Text and raw source stay available for
                    debugging.
                  </p>
                </div>
              </div>
            ) : loadingDetail && !detail ? (
              <p className="px-6 py-8 text-sm text-[var(--text-muted)]">Loading message…</p>
            ) : detail ? (
              <>
                <div className="border-b border-[var(--line)] px-5 py-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">{detail.subject}</h2>
                    <button
                      type="button"
                      onClick={() => void deleteSelected()}
                      className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                    >
                      Delete
                    </button>
                  </div>
                  <dl className="grid gap-1 text-sm text-[var(--text-muted)]">
                    <div>
                      <span className="text-[var(--text)]">From:</span> {detail.from}
                    </div>
                    <div>
                      <span className="text-[var(--text)]">To:</span>{" "}
                      {detail.to
                        .map((a) => a.address || a.name)
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                    {detail.cc.length ? (
                      <div>
                        <span className="text-[var(--text)]">Cc:</span>{" "}
                        {detail.cc
                          .map((a) => a.address || a.name)
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    ) : null}
                    <div>
                      <span className="text-[var(--text)]">Received:</span>{" "}
                      {new Date(detail.createdAt).toLocaleString()}
                    </div>
                  </dl>
                  {detail.attachments.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {detail.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={`/api/emails/${detail.id}/attachments/${attachment.id}`}
                          className="rounded-lg border border-[var(--line)] bg-[var(--bg-panel)] px-3 py-1.5 text-xs text-[var(--unread)] transition hover:border-[var(--accent)]"
                        >
                          {attachment.filename} ({formatBytes(attachment.size)})
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-2">
                  <div className="flex gap-1">
                    {(
                      [
                        ["html", "HTML", Boolean(detail.previewHtml)],
                        ["text", "Text", Boolean(detail.textBody)],
                        ["raw", "Raw", true],
                      ] as const
                    ).map(([key, label, enabled]) => (
                      <button
                        key={key}
                        type="button"
                        disabled={!enabled}
                        onClick={() => setTab(key)}
                        className={`rounded-lg px-3 py-1.5 text-xs transition ${
                          tab === key
                            ? "bg-[var(--accent-soft)] text-[var(--unread)]"
                            : enabled
                              ? "text-[var(--text-muted)] hover:text-[var(--text)]"
                              : "cursor-not-allowed text-[var(--line)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {tab === "html" && detail.previewHtml ? (
                    <div className="flex items-center gap-0.5" role="group" aria-label="Preview viewport">
                      {VIEWPORT_OPTIONS.map(({ id, label, icon }) => (
                        <button
                          key={id}
                          type="button"
                          aria-label={label}
                          aria-pressed={viewport === id}
                          title={label}
                          onClick={() => setViewport(id)}
                          className={`rounded-lg p-1.5 transition ${
                            viewport === id
                              ? "bg-[var(--accent-soft)] opacity-100"
                              : "opacity-45 hover:opacity-80"
                          }`}
                        >
                          <img src={icon} alt="" width={20} height={20} className="block" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-hidden p-3">
                  {tab === "html" && detail.previewHtml ? (
                    <div className="flex h-full justify-center overflow-auto">
                      <iframe
                        title="Email HTML preview"
                        sandbox=""
                        srcDoc={detail.previewHtml}
                        style={{
                          width: VIEWPORT_WIDTHS[viewport],
                          maxWidth: "100%",
                        }}
                        className="h-full shrink-0 rounded-lg border border-[var(--line)] bg-white transition-[width] duration-200"
                      />
                    </div>
                  ) : null}
                  {tab === "text" ? (
                    <pre className="h-full overflow-auto rounded-lg border border-[var(--line)] bg-[var(--bg-panel)] p-4 font-[family-name:var(--font-mono)] text-xs leading-relaxed whitespace-pre-wrap text-[var(--text)]">
                      {detail.textBody || "(empty)"}
                    </pre>
                  ) : null}
                  {tab === "raw" ? (
                    <pre className="h-full overflow-auto rounded-lg border border-[var(--line)] bg-[var(--bg-panel)] p-4 font-[family-name:var(--font-mono)] text-xs leading-relaxed whitespace-pre-wrap text-[var(--text-muted)]">
                      {detail.raw}
                    </pre>
                  ) : null}
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </AppShell>
  );
}
