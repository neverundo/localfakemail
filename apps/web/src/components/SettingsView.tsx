"use client";

import { useCallback, useEffect, useState } from "react";
import type { CredentialListItem } from "@/lib/types";
import { AppShell } from "@/components/AppShell";

type CreatedCredential = {
  credential: CredentialListItem;
  secret: string;
  laravelEnv: string;
};

export function SettingsView() {
  const [credentials, setCredentials] = useState<CredentialListItem[]>([]);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<CreatedCredential | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"env" | "secret" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCredentials = useCallback(async () => {
    try {
      const res = await fetch("/api/credentials", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load credentials");
      const data = (await res.json()) as { credentials: CredentialListItem[] };
      setCredentials(data.credentials);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load credentials");
    }
  }, []);

  useEffect(() => {
    void loadCredentials();
  }, [loadCredentials]);

  async function createCredential() {
    setBusy(true);
    setCreated(null);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed to create credentials");
      const data = (await res.json()) as CreatedCredential;
      setCreated(data);
      setLabel("");
      await loadCredentials();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create credentials");
    } finally {
      setBusy(false);
    }
  }

  async function revokeCredential(id: string) {
    if (!window.confirm("Revoke this SMTP credential? Existing apps using it will fail auth.")) {
      return;
    }
    const res = await fetch(`/api/credentials/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    if (created?.credential.id === id) setCreated(null);
    await loadCredentials();
  }

  async function copyText(text: string, kind: "env" | "secret") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <AppShell>
      <div className="fade-up mx-auto max-w-3xl space-y-6">
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--bg-panel)]/85 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur">
          <h2 className="text-xl font-semibold tracking-tight">SMTP credentials</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Generate a key/secret pair for Laravel. The secret is shown once. SMTP listens on{" "}
            <code className="font-[family-name:var(--font-mono)] text-[var(--unread)]">
              127.0.0.1:1025
            </code>{" "}
            and requires authentication.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Optional label (e.g. laravel-app)"
              className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void createCredential()}
              className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[#04140c] transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Generating…" : "Generate key / secret"}
            </button>
          </div>

          {created ? (
            <div className="mt-6 space-y-4 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-4">
              <p className="text-sm font-medium text-[var(--unread)]">
                Secret shown once — copy it into your Laravel .env now.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs tracking-wide text-[var(--text-muted)] uppercase">
                    Username (key)
                  </p>
                  <code className="block break-all rounded-lg bg-[var(--bg-panel)] px-3 py-2 font-[family-name:var(--font-mono)] text-xs">
                    {created.credential.username}
                  </code>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-xs tracking-wide text-[var(--text-muted)] uppercase">
                      Password (secret)
                    </p>
                    <button
                      type="button"
                      onClick={() => void copyText(created.secret, "secret")}
                      className="text-xs text-[var(--unread)]"
                    >
                      {copied === "secret" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <code className="block break-all rounded-lg bg-[var(--bg-panel)] px-3 py-2 font-[family-name:var(--font-mono)] text-xs">
                    {created.secret}
                  </code>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs tracking-wide text-[var(--text-muted)] uppercase">
                    Laravel .env snippet
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyText(created.laravelEnv, "env")}
                    className="text-xs text-[var(--unread)]"
                  >
                    {copied === "env" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-[var(--bg-panel)] p-3 font-[family-name:var(--font-mono)] text-xs leading-relaxed whitespace-pre-wrap text-[var(--text)]">
                  {created.laravelEnv}
                </pre>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--bg-panel)]/85 p-6 backdrop-blur">
          <h3 className="text-lg font-medium">Existing credentials</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Revoked credentials can no longer authenticate SMTP clients.
          </p>

          <div className="mt-4 divide-y divide-[var(--line)]">
            {!credentials.length ? (
              <p className="py-4 text-sm text-[var(--text-muted)]">No credentials yet.</p>
            ) : null}
            {credentials.map((credential) => {
              const revoked = Boolean(credential.revokedAt);
              return (
                <div
                  key={credential.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-sm">
                      {credential.username}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {credential.label ? `${credential.label} · ` : ""}
                      created {new Date(credential.createdAt).toLocaleString()}
                      {revoked
                        ? ` · revoked ${new Date(credential.revokedAt!).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  {revoked ? (
                    <span className="text-xs text-[var(--text-muted)]">Revoked</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void revokeCredential(credential.id)}
                      className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <p className="px-1 text-xs leading-relaxed text-[var(--text-muted)]">
          localfakemail binds to localhost only and is intended for local development — do not
          expose it to the public internet.
        </p>

        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
