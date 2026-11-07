# localfakemail

[Português](README.md) · **English**

**Local mini-app to capture SMTP emails during development — no more expensive Mailtrap.io subscriptions.**  
HTML email formatting preview for desktop, tablet, and smartphone screens.  
Extra: Lorem ipsum generator with paragraph and word counters, Lorem list creation, and string character counter.

## What's included

- **SMTP** on `127.0.0.1:1025` with required authentication
- **UI** at `http://127.0.0.1:8025` (inbox + settings)
- Internal **PostgreSQL** (not exposed to the host)
- **Key/secret** generation and `.env` snippet for Laravel

## Prerequisites

- Docker + Docker Compose

## Getting started

```bash
cp .env.example .env
docker compose up --build
```

Open the UI: [http://127.0.0.1:8025](http://127.0.0.1:8025)

## Configure in your app

1. In **Settings**, generate a key/secret pair.
2. Copy the snippet into your app's development `.env`. Example for a Laravel app:

```env
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_USERNAME=<generated key>
MAIL_PASSWORD=<generated secret>
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"
```

3. Send an email from your app — it appears in the localfakemail inbox.

If the Laravel app also runs in Docker on the same machine, use `host.docker.internal` (or the host IP) instead of `127.0.0.1` for `MAIL_HOST`.

## Ports

| Service | Host |
|---------|------|
| Web UI | `127.0.0.1:8025` |
| SMTP | `127.0.0.1:1025` |
| Postgres | Docker network only |

Change `WEB_PORT` / `SMTP_PORT` in `.env` if you need different ports.

## Security

- Published ports are bound to `127.0.0.1` only
- SMTP requires credentials (bcrypt); the secret is shown only once
- Email HTML is sanitized and rendered in a sandboxed iframe
- **Do not** expose this service to the internet — it is for local development only

## Useful commands

```bash
# Follow logs
docker compose logs -f

# Stop
docker compose down

# Wipe data (emails + credentials)
docker compose down -v
```

## Architecture

- `apps/web` — Next.js (UI + API + Prisma)
- `apps/smtp` — Node SMTP server (`smtp-server` + `mailparser`)
- `db` — PostgreSQL 16
