# localfakemail — Technical Product Spec & Implementation Plan

**Status:** living document  
**Product:** local-first email testing for developers  
**Runtime:** Docker Compose only (`web` :8025, `smtp` :1025, `db` internal)  
**Audience:** maintainers and contributors

This document freezes product direction for portfolio-quality iteration: what already exists, what we will build next, data model, API contracts, acceptance criteria, and PR order.

---

## 1. Positioning

**Not:** “another Mailtrap alternative.”  
**Yes:** a local-first SMTP capture platform — self-hosted, zero cloud, zero subscription — with responsive inspection and an HTTP surface for automated tests.

One-liner for the public repo:

> Self-hosted email testing with Docker: capture SMTP locally, inspect HTML on desktop/tablet/smartphone, revoke credentials, and query messages from CI — no cloud required.

### Non-goals (near term)

- Multi-user / team collaboration / cloud sync
- Heavy “Project” entity (credentials + labels are enough)
- Multi-language SDKs before a stable wait/filter API
- Open relay, public bind (`0.0.0.0` host publish), or internet exposure
- Claiming unlimited storage (capture is limited by disk + `EMAIL_RETENTION_LIMIT`)

---

## 2. Current architecture (as-built)

```text
Developer app  --SMTP AUTH-->  smtp (Node, smtp-server + mailparser)
                                    |
                                    v
                              PostgreSQL 16
                                    ^
Browser / scripts --HTTP-->  web (Next.js UI + Route Handlers + Prisma)
```

| Service | Path | Role |
|---------|------|------|
| `web` | `apps/web` | Inbox, Settings, Lorem, Character Counter, REST API |
| `smtp` | `apps/smtp` | SMTP listen, bcrypt auth, MIME parse, persist, retention prune |
| `db` | Postgres image | Credentials, emails, attachments |

**Security defaults already in place**

1. Capture only — never deliver to real recipients / no relay.
2. SMTP auth required (`authOptional: false`).
3. Secrets stored as bcrypt hashes; plaintext shown once at creation.
4. Host ports bound to `127.0.0.1` only.
5. Configurable retention (`EMAIL_RETENTION_LIMIT`).
6. HTML sanitized + sandboxed iframe preview.

**Storage note:** raw MIME and attachment bytes live in Postgres today. Acceptable for local MVP. Migration to volume blobs is deferred to P3 if size becomes painful.

---

## 3. Gap analysis vs product vision

| Area | Today | Target |
|------|-------|--------|
| HTML / text / raw preview | Done (+ device viewports) | Keep; polish |
| Headers in UI | In API only | Dedicated Headers panel |
| Bcc in UI | Stored, not shown | Show when present |
| Credential-scoped inbox | `credentialId` on row; UI lists all | Filter UI + API by credential |
| Search | None | Subject / from / to / free text |
| Test API (`wait` / filters) | Basic list/get | Query + wait semantics |
| Real-time | Interval polling | Keep polling; optional SSE in P2 |
| SMTP failure simulation | None | Per-credential error modes (P3) |
| Lorem + character counter | Done | Keep as copy/DX extras |

---

## 4. Data model

### 4.1 Current Prisma models (keep)

```prisma
model Credential {
  id           String    @id @default(cuid())
  username     String    @unique   // SMTP AUTH user, e.g. lfm_…
  passwordHash String
  label        String?
  createdAt    DateTime  @default(now())
  revokedAt    DateTime?
  emails       Email[]
}

model Email {
  id           String       @id @default(cuid())
  messageId    String?
  from         String
  to           Json         // Address[]
  cc           Json
  bcc          Json
  subject      String
  textBody     String?
  htmlBody     String?
  headers      Json
  raw          String
  size         Int
  readAt       DateTime?
  createdAt    DateTime     @default(now())
  credentialId String?
  credential   Credential?  @relation(...)
  attachments  Attachment[]
}

model Attachment {
  id          String @id @default(cuid())
  emailId     String
  filename    String
  contentType String
  size        Int
  content     Bytes
  email       Email  @relation(...)
}
```

### 4.2 Planned additive fields (no `Project` table)

**P0 — none required** if list/filter uses existing `credentialId` + indexes.

**P1 (optional):** denormalized search helpers only if Postgres JSON queries prove awkward:

```prisma
// Optional later — prefer JSON path queries first
@@index([credentialId, createdAt(sort: Desc)])
```

Add composite index early in P0:

```prisma
model Email {
  // ...
  @@index([createdAt(sort: Desc)])
  @@index([credentialId, createdAt(sort: Desc)])
}
```

**P3 — SMTP simulation** (on `Credential`):

```prisma
model Credential {
  // ...
  smtpSimulateCode Int?    // e.g. 421, 450, 550, 554; null = accept
  smtpSimulateAfter Int?   // accept N messages then fail; null = always simulate when code set
}
```

Behaviour: after AUTH succeeds, `onData` (or MAIL/RCPT) responds with the configured SMTP code instead of storing — documents resiliency testing.

**P3 — blob offload (optional):**

```prisma
model Attachment {
  content   Bytes?   // nullable when offloaded
  storagePath String?
}
model Email {
  raw         String?  // or drop when rawPath set
  rawPath     String?
}
```

---

## 5. API contracts

Base URL: `http://127.0.0.1:8025` (host) or `http://web:3000` (Compose network).  
No auth on HTTP in v1 (localhost-only trust model). Document clearly; do not expose to the internet.

### 5.1 Existing (keep)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Liveness + DB check |
| `GET` | `/api/emails` | List (newest first, capped) |
| `GET` | `/api/emails/:id` | Detail (+ mark read) |
| `DELETE` | `/api/emails/:id` | Delete one |
| `GET` | `/api/emails/:id/attachments/:attachmentId` | Download bytes |
| `GET` | `/api/credentials` | List credentials |
| `POST` | `/api/credentials` | Create (returns secret once + Laravel snippet) |
| `DELETE` | `/api/credentials/:id` | Revoke |

### 5.2 P0 — list filters

`GET /api/emails`

| Query | Type | Semantics |
|-------|------|-----------|
| `credentialId` | string | Only emails for that credential |
| `username` | string | Resolve credential by SMTP username (`lfm_…`) |
| `to` | string | Case-insensitive substring match in `to` addresses |
| `from` | string | Substring match on `from` |
| `subject` | string | Case-insensitive substring |
| `since` | ISO-8601 | `createdAt >= since` |
| `unread` | `true`\|`false` | Filter by `readAt` |
| `limit` | int | Default 200, max 500 |
| `offset` | int | Pagination |

**Response** (unchanged shape, filtered):

```json
{
  "emails": [
    {
      "id": "…",
      "from": "App <noreply@example.com>",
      "to": [{ "name": null, "address": "user@example.com" }],
      "subject": "Verify your account",
      "size": 4096,
      "readAt": null,
      "createdAt": "2026-11-08T18:00:00.000Z",
      "hasHtml": true,
      "attachmentCount": 0,
      "credentialId": "…"
    }
  ]
}
```

Add `credentialId` (and optionally `credentialLabel`) to list/detail payloads in P0.

### 5.3 P1 — wait for message (testing surface)

`GET /api/emails/wait`

Long-poll helper for E2E tests. Same filters as list (`to`, `subject`, `credentialId` / `username`, `since`, …) plus:

| Query | Type | Default | Semantics |
|-------|------|---------|-----------|
| `timeoutMs` | int | `30000` | Max wait (cap e.g. 120000) |
| `intervalMs` | int | `500` | Server-side poll interval |

**Responses**

- `200` — `{ "email": EmailDetail }` first match (full detail, same as `GET /api/emails/:id`)
- `408` — `{ "error": "timeout" }` no match within timeout

Clients may also poll `GET /api/emails` themselves; `/wait` is convenience for CI.

### 5.4 P1 — delete-all / clear (optional)

`DELETE /api/emails?credentialId=` — clear inbox (all or scoped). Useful between tests. Require explicit query `confirm=true` to avoid accidents.

### 5.5 P2 — search

`GET /api/emails?q=` — free-text across subject, from, to, and optionally text body (not raw MIME by default for performance).

### 5.6 Out of scope until P3+

- Webhook push on new mail
- Signed HTTP API keys (unless host exposure becomes a supported mode)
- Official multi-language SDKs (ship a tiny TS helper under `packages/client` only after `/wait` is stable)

### 5.7 Example E2E usage (target)

```ts
const base = "http://127.0.0.1:8025";

// after triggering signup in the app under test:
const res = await fetch(
  `${base}/api/emails/wait?` +
    new URLSearchParams({
      to: "user@example.com",
      subject: "Verify your account",
      username: process.env.MAIL_USERNAME!,
      timeoutMs: "30000",
    }),
);
if (!res.ok) throw new Error("email not received");
const { email } = await res.json();
expect(email.htmlBody).toMatch(/verify/i);
const link = email.htmlBody.match(/https?:\/\/[^"]+/)?.[0];
```

---

## 6. UI requirements

### P0

1. **Headers panel** — tab or collapsible section listing `headers` key/value.
2. **Bcc line** — show when `bcc.length > 0`.
3. **Credential filter** — dropdown/select: All | label/username; persists in URL query (`?credentialId=`).
4. List row or detail shows which credential received the message.

### P1

5. README section: “Automated tests” with curl + Vitest/Playwright snippet.
6. Optional “Copy as wait URL” in detail view (prefilled filters).

### P2

7. Search box (`q`) with debounce.
8. Optional SSE `GET /api/emails/stream` to replace/improve polling (polling remains fallback).

### Extras (maintain, do not block core)

- `/lorem` — Lorem Ipsum generator  
- `/counter` — character counter / truncation preview  

---

## 7. Phased roadmap & acceptance criteria

### P0 — Polish MVP (portfolio-ready core)

| ID | Work item | Acceptance criteria |
|----|-----------|---------------------|
| P0.1 | Composite DB index `credentialId + createdAt` | Migration applies cleanly in Compose |
| P0.2 | API list filters (`credentialId`, `username`, `to`, `from`, `subject`, `since`, `unread`, `limit`, `offset`) | Unit/integration tests cover each filter; empty result is `200 []` |
| P0.3 | Expose `credentialId` (+ label) on list/detail | UI and API consumers can attribute mail |
| P0.4 | Inbox credential filter | Selecting a credential hides other apps’ mail; “All” restores |
| P0.5 | Headers + Bcc in detail UI | Headers visible; Bcc only when present |
| P0.6 | Docs touch | README points to this roadmap; filter query params documented |

**Done when:** developer with two credentials (e.g. Laravel + Node) can isolate each inbox in the UI and via API.

### P1 — Testing surface

| ID | Work item | Acceptance criteria |
|----|-----------|---------------------|
| P1.1 | `GET /api/emails/wait` | Returns matching detail or 408; respects timeout cap |
| P1.2 | Tests for wait + filters | Deterministic tests with injected DB rows or SMTP send in Compose |
| P1.3 | README “Automated tests” | Copy-paste example works against `docker compose up` |
| P1.4 | Optional `DELETE /api/emails?confirm=true` | Clears scoped or global inbox |
| P1.5 | Tiny TS helper (optional) | `waitForMessage({…})` wraps `/wait`; published as path in repo, not npm-required |

**Done when:** a Playwright/Vitest example in-repo waits for a verification email and asserts subject/body.

### P2 — DX & discovery

| ID | Work item | Acceptance criteria |
|----|-----------|---------------------|
| P2.1 | `q` search | Matches subject/from/to; documented |
| P2.2 | CONTRIBUTING.md + good-first-issues labels | External contributor can run tests in Docker or documented host path |
| P2.3 | SSE (optional) | New mail updates inbox without full-page refresh; polling fallback remains |
| P2.4 | Credential badge in list | Clear visual attribution |

**Done when:** stranger can clone, run Compose, and find “how to test with the API” within one screen of the README.

### P3 — Engineering showcase

| ID | Work item | Acceptance criteria |
|----|-----------|---------------------|
| P3.1 | SMTP error simulation on credential | Configurable 421/450/550/554; client sees real SMTP failure |
| P3.2 | Settings UI for simulation | Can enable/disable without DB surgery |
| P3.3 | Blob volume offload (if needed) | Large attachments no longer bloat primary table; download still works |
| P3.4 | Document resiliency recipe | README section: test retries/backoff against localfakemail |

**Done when:** demo GIF/script shows app retry behaviour against forced 421 then success.

---

## 8. Suggested PR order

Small, reviewable PRs for a public GitHub history:

| PR | Title (suggested) | Phase | Depends on |
|----|-------------------|-------|------------|
| 1 | `feat(api): filter emails by credential and address fields` | P0.1–P0.3 | — |
| 2 | `feat(ui): credential filter, headers panel, and bcc` | P0.4–P0.5 | PR 1 |
| 3 | `docs: document email query params and link roadmap` | P0.6 | PR 1 |
| 4 | `feat(api): long-poll wait endpoint for E2E tests` | P1.1–P1.2 | PR 1 |
| 5 | `docs: automated testing examples` (+ optional clear inbox) | P1.3–P1.4 | PR 4 |
| 6 | `feat: optional TypeScript waitForMessage helper` | P1.5 | PR 4 |
| 7 | `feat(ui): inbox search` | P2.1, P2.4 | PR 2 |
| 8 | `docs: CONTRIBUTING and issue templates` | P2.2 | — |
| 9 | `feat: SSE inbox updates` (optional) | P2.3 | PR 1 |
| 10 | `feat(smtp): per-credential failure simulation` | P3.1–P3.2, P3.4 | PR 2 |
| 11 | `refactor: store large MIME/attachments on volume` | P3.3 | only if needed |

Each PR should include: schema/API changes, tests in existing Vitest (or SMTP integration where relevant), and README deltas when behaviour is user-visible.

---

## 9. Implementation constraints (project rules)

1. **Docker is the source of truth** — every feature must work with `docker compose up --build`.
2. Host ports stay on **`127.0.0.1:8025`** (web) and **`127.0.0.1:1025`** (SMTP) unless `.env` overrides.
3. Do not implement SMTP protocol from scratch — keep `smtp-server` + `mailparser`.
4. Keep SMTP process **out of** the Next.js app.
5. Prefer TypeScript throughout.
6. Fix type errors; do not bypass them.
7. No team/cloud auth scope without an explicit new product decision.

---

## 10. Success metrics (portfolio + utility)

Qualitative signals that matter more than vanity stars:

- Clone → Compose → first captured email in **&lt; 5 minutes**
- Two apps isolated by credentials without DB surgery
- At least one in-repo E2E example using `/api/emails/wait`
- Issues/PRs from other developers possible via CONTRIBUTING
- README positioning remains local-first, not “cheap Mailtrap”

---

## 11. Open decisions (resolve during P0/P1)

| Decision | Recommendation | When |
|----------|----------------|------|
| HTTP API auth | None while localhost-bound | Revisit only if LAN/expose mode ships |
| `username` vs `credentialId` filter | Support both | P0 |
| Wait via long-poll vs client-only polling | Ship `/wait` long-poll | P1 |
| Introduce `Project` model | **No** — labels on credentials | Unless multi-tenant UI is demanded |
| npm publish client | Path in monorepo first | After P1 stable |

---

## 12. Document history

| Date | Change |
|------|--------|
| 2026-11-08 | Initial TPS + implementation plan (P0–P3, API, PR order) |
