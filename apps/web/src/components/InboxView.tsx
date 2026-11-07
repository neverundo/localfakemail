"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Address, EmailDetail, EmailListItem } from "@/lib/types";
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

function pickDefaultTab(email: EmailDetail): PreviewTab {
  if (email.previewHtml) return "html";
  if (email.textBody) return "text";
  return "raw";
}

function formatRecipientList(addresses: Address[]): string {
  return addresses
    .map((a) => a.address || a.name)
    .filter(Boolean)
    .join(", ");
}

function tabButtonClass(active: boolean, enabled: boolean): string {
  if (active) return "bg-[var(--accent-soft)] text-[var(--unread)]";
  if (enabled) return "cursor-pointer text-[var(--text-muted)] hover:text-[var(--text)]";
  return "cursor-not-allowed text-[var(--line)]";
}

function EmailRow({
  email,
  active,
  onSelect,
}: Readonly<{
  email: EmailListItem;
  active: boolean;
  onSelect: (id: string) => void;
}>) {
  const unread = !email.readAt;
  return (
    <button
      type="button"
      onClick={() => onSelect(email.id)}
      className={`fade-up block w-full cursor-pointer border-b border-[var(--line)] px-4 py-3 text-left transition ${
        active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-hover)]"
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        {unread ? (
          <span className="unread-dot inline-block h-2 w-2 rounded-full bg-[var(--unread)]" />
        ) : (
          <span className="inline-block h-2 w-2 rounded-full bg-transparent" />
        )}
        <span className={`truncate text-sm ${unread ? "font-semibold" : "font-medium"}`}>
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
}

function HtmlPreview({
  html,
  viewport,
}: Readonly<{
  html: string;
  viewport: PreviewViewport;
}>) {
  const iframe = (
    <iframe
      key={viewport}
      title="Email HTML preview"
      sandbox=""
      srcDoc={html}
      data-viewport={viewport}
      style={
        viewport === "desktop"
          ? { width: VIEWPORT_WIDTHS.desktop, maxWidth: "100%" }
          : undefined
      }
      className={
        viewport === "desktop"
          ? "h-full shrink-0 rounded-lg border border-[var(--line)] bg-white transition-[width] duration-200"
          : "h-full w-full bg-white"
      }
    />
  );

  if (viewport === "desktop") {
    return <div className="flex h-full justify-center overflow-auto">{iframe}</div>;
  }

  return (
    <div className="flex h-full justify-center overflow-auto p-2 sm:p-4">
      <div
        className={`device-frame device-frame--${viewport}`}
        data-testid={`device-frame-${viewport}`}
        style={{ width: VIEWPORT_WIDTHS[viewport], maxWidth: "100%" }}
      >
        <div className="device-frame__sensor" aria-hidden />
        <div className="device-frame__screen">{iframe}</div>
        <div className="device-frame__home" aria-hidden />
      </div>
    </div>
  );
}

function MessageDetail({
  detail,
  tab,
  viewport,
  onTabChange,
  onViewportChange,
  onDelete,
}: Readonly<{
  detail: EmailDetail;
  tab: PreviewTab;
  viewport: PreviewViewport;
  onTabChange: (tab: PreviewTab) => void;
  onViewportChange: (viewport: PreviewViewport) => void;
  onDelete: () => void;
}>) {
  const toLine = formatRecipientList(detail.to) || "—";
  const ccLine = detail.cc.length ? formatRecipientList(detail.cc) : null;

  return (
    <>
      <div className="border-b border-[var(--line)] px-5 py-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">{detail.subject}</h2>
          <button
            type="button"
            onClick={onDelete}
            className="cursor-pointer rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
          >
            Delete
          </button>
        </div>
        <dl className="grid gap-1 text-sm text-[var(--text-muted)]">
          <div>
            <span className="text-[var(--text)]">From:</span> {detail.from}
          </div>
          <div>
            <span className="text-[var(--text)]">To:</span> {toLine}
          </div>
          {ccLine ? (
            <div>
              <span className="text-[var(--text)]">Cc:</span> {ccLine}
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
              onClick={() => onTabChange(key)}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${tabButtonClass(tab === key, enabled)}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "html" && detail.previewHtml ? (
          <fieldset className="m-0 flex items-center gap-0.5 border-0 p-0">
            <legend className="sr-only">Preview viewport</legend>
            {VIEWPORT_OPTIONS.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-pressed={viewport === id}
                title={label}
                onClick={() => onViewportChange(id)}
                className={`cursor-pointer rounded-lg p-1.5 transition ${
                  viewport === id
                    ? "bg-[var(--accent-soft)] opacity-100"
                    : "opacity-45 hover:opacity-80"
                }`}
              >
                <img src={icon} alt="" width={20} height={20} className="block" />
              </button>
            ))}
          </fieldset>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-3">
        {tab === "html" && detail.previewHtml ? (
          <HtmlPreview html={detail.previewHtml} viewport={viewport} />
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
  );
}

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
      setTab(pickDefaultTab(data.email));
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

  let previewPane: ReactNode;
  if (!selectedId) {
    previewPane = (
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <div>
          <p className="text-lg font-medium">Select a message</p>
          <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
            HTML renders in a sandboxed preview. Text and raw source stay available for debugging.
          </p>
        </div>
      </div>
    );
  } else if (loadingDetail && !detail) {
    previewPane = (
      <p className="px-6 py-8 text-sm text-[var(--text-muted)]">Loading message…</p>
    );
  } else if (detail) {
    previewPane = (
      <MessageDetail
        detail={detail}
        tab={tab}
        viewport={viewport}
        onTabChange={setTab}
        onViewportChange={setViewport}
        onDelete={() => void deleteSelected()}
      />
    );
  } else {
    previewPane = null;
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
                  className="cursor-pointer rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void clearInbox()}
                  className="cursor-pointer rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--text-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
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
              {emails.map((email) => (
                <EmailRow
                  key={email.id}
                  email={email}
                  active={email.id === selectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col bg-[var(--bg-elevated)]/40">{previewPane}</section>
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
