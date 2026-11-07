"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryLinks = [
  {
    href: "/",
    label: "Inbox",
    match: (pathname: string) =>
      pathname === "/" || pathname.startsWith("/settings"),
  },
  {
    href: "/lorem",
    label: "Lorem Ipsum",
    match: (pathname: string) => pathname.startsWith("/lorem"),
  },
  {
    href: "/counter",
    label: "Character Counter",
    match: (pathname: string) => pathname.startsWith("/counter"),
  },
] as const;

const inboxLinks = [
  { href: "/", label: "Inbox" },
  { href: "/settings", label: "Settings" },
] as const;

function isInboxScope(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/settings");
}

function eyebrowForPath(pathname: string): string {
  if (isInboxScope(pathname)) return "Local SMTP capture";
  if (pathname.startsWith("/counter")) return "Instant character count";
  if (pathname.startsWith("/lorem")) return "Offline placeholder text";
  return "Offline placeholder text";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inboxScope = isInboxScope(pathname);
  const activePrimary = primaryLinks.find((link) => link.match(pathname)) ?? primaryLinks[0];

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col px-4 py-4 md:px-6 md:py-6">
      <header className="mb-5 grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="md:justify-self-start">
          <p className="mb-1 text-xs tracking-[0.18em] text-[var(--text-muted)] uppercase">
            {eyebrowForPath(pathname)}
          </p>
          <h1 className="flex items-center gap-2.5 text-3xl font-semibold tracking-tight text-[var(--text)] md:gap-3 md:text-4xl">
            <img
              src="/icons/localfakemail.svg"
              alt=""
              width={36}
              height={36}
              className="size-8 shrink-0 md:size-9"
            />
            localfakemail
          </h1>
        </div>

        <nav
          aria-label="Main"
          className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--bg-panel)]/80 p-1 backdrop-blur md:justify-self-center"
        >
          {primaryLinks.map((link) => {
            const active = link.href === activePrimary.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--unread)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="md:justify-self-end">
          {inboxScope ? (
            <nav
              aria-label="Inbox"
              className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--bg-panel)]/80 p-1 backdrop-blur"
            >
              {inboxLinks.map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-4 py-1.5 text-sm transition ${
                      active
                        ? "bg-[var(--accent-soft)] text-[var(--unread)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <div className="hidden h-9 md:block" aria-hidden />
          )}
        </div>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
