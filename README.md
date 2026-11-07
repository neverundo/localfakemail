# localfakemail

**Português** · [English](README.en.md)

**Mini-app local para capturar emails SMTP durante o desenvolvimento — adeus subscrição onerosa do Mailtrap.io.**  
Formatação de emails em HTML para ecrâs desktop, tablet e smartphone.  
Exta: "Lorem ipsun generator" com contador de parágrafos e palavras, criação de listas Lorem e contador de caracteres de string.

## O que inclui

- **SMTP** em `127.0.0.1:1025` com autenticação obrigatória
- **UI** em `http://127.0.0.1:8025` (inbox + definições)
- **PostgreSQL** interno (não exposto ao host)
- Geração de **key/secret** e snippet `.env` para Laravel

## Pré-requisitos

- Docker + Docker Compose

## Arranque

```bash
cp .env.example .env
docker compose up --build
```

Abrir a UI: [http://127.0.0.1:8025](http://127.0.0.1:8025)

## Configurar na tua app

1. Em **Settings**, gera um par key/secret.
2. Copia o snippet para o `.env` de desenvolvimento da tua app. Abaixo, exemplo para app Laravel:

```env
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_USERNAME=<key gerada>
MAIL_PASSWORD=<secret gerado>
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"
```

3. Envia um email a partir da app — aparece na inbox do localfakemail.

Se a app Laravel também correr em Docker na mesma máquina, usa `host.docker.internal` (ou o IP do host) em vez de `127.0.0.1` para `MAIL_HOST`.

## Portas

| Serviço | Host |
|---------|------|
| UI web | `127.0.0.1:8025` |
| SMTP | `127.0.0.1:1025` |
| Postgres | só rede Docker interna |

Altera `WEB_PORT` / `SMTP_PORT` no `.env` se precisares de outras portas.

## Segurança

- Portas publicadas só em `127.0.0.1`
- SMTP exige credenciais (bcrypt); o secret só é mostrado uma vez
- HTML do email é sanitizado e renderizado num iframe sandboxed
- **Não** expor este serviço à internet — é só para desenvolvimento local

## Comandos úteis

```bash
# Ver logs
docker compose logs -f

# Parar
docker compose down

# Apagar dados (emails + credenciais)
docker compose down -v
```

## Arquitetura

- `apps/web` — Next.js (UI + API + Prisma)
- `apps/smtp` — servidor SMTP Node (`smtp-server` + `mailparser`)
- `db` — PostgreSQL 16
