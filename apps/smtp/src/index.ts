import { randomUUID } from "node:crypto";
import { SMTPServer, type SMTPServerAuthentication, type SMTPServerSession } from "smtp-server";
import { simpleParser, type Attachment as ParsedAttachment } from "mailparser";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? "1025");
const EMAIL_RETENTION_LIMIT = Number(process.env.EMAIL_RETENTION_LIMIT ?? "500");

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

type CredentialRow = {
  id: string;
  username: string;
  passwordHash: string;
};

type AddressObject = {
  value: Array<{ name?: string; address?: string }>;
};

function addressesToJson(value: AddressObject | AddressObject[] | undefined): unknown {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      item.value.map((addr) => ({
        name: addr.name || null,
        address: addr.address || null,
      })),
    );
  }
  return value.value.map((addr) => ({
    name: addr.name || null,
    address: addr.address || null,
  }));
}

function fromToString(from: AddressObject | undefined): string {
  if (!from?.value?.length) return "";
  const first = from.value[0];
  if (first.name && first.address) return `${first.name} <${first.address}>`;
  return first.address ?? first.name ?? "";
}

async function waitForDb(retries = 30): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Database not ready");
}

async function findCredential(username: string): Promise<CredentialRow | null> {
  const result = await pool.query<CredentialRow>(
    `SELECT id, username, "passwordHash"
     FROM "Credential"
     WHERE username = $1 AND "revokedAt" IS NULL
     LIMIT 1`,
    [username],
  );
  return result.rows[0] ?? null;
}

async function pruneOldEmails(): Promise<void> {
  if (!Number.isFinite(EMAIL_RETENTION_LIMIT) || EMAIL_RETENTION_LIMIT <= 0) {
    return;
  }

  await pool.query(
    `DELETE FROM "Email"
     WHERE id IN (
       SELECT id FROM "Email"
       ORDER BY "createdAt" DESC
       OFFSET $1
     )`,
    [EMAIL_RETENTION_LIMIT],
  );
}

async function storeEmail(params: {
  credentialId: string;
  raw: Buffer;
}): Promise<void> {
  const parsed = await simpleParser(params.raw);
  const emailId = randomUUID();
  const headers: Record<string, string> = {};

  for (const [key, value] of parsed.headers) {
    headers[key] = Array.isArray(value) ? value.map(String).join(", ") : String(value);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO "Email" (
         id, "messageId", "from", "to", cc, bcc, subject,
         "textBody", "htmlBody", headers, raw, size, "readAt", "createdAt", "credentialId"
       ) VALUES (
         $1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7,
         $8, $9, $10::jsonb, $11, $12, NULL, NOW(), $13
       )`,
      [
        emailId,
        parsed.messageId ?? null,
        fromToString(parsed.from as AddressObject | undefined),
        JSON.stringify(addressesToJson(parsed.to as AddressObject | AddressObject[] | undefined)),
        JSON.stringify(addressesToJson(parsed.cc as AddressObject | AddressObject[] | undefined)),
        JSON.stringify(addressesToJson(parsed.bcc as AddressObject | AddressObject[] | undefined)),
        parsed.subject ?? "(no subject)",
        parsed.text ?? null,
        typeof parsed.html === "string" ? parsed.html : null,
        JSON.stringify(headers),
        params.raw.toString("utf8"),
        params.raw.length,
        params.credentialId,
      ],
    );

    const attachments = parsed.attachments ?? [];
    for (const attachment of attachments as ParsedAttachment[]) {
      await client.query(
        `INSERT INTO "Attachment" (
           id, "emailId", filename, "contentType", size, content
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          randomUUID(),
          emailId,
          attachment.filename ?? "attachment",
          attachment.contentType || "application/octet-stream",
          attachment.size ?? attachment.content.length,
          attachment.content,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await pruneOldEmails();
  console.log(`Stored email ${emailId} (${params.raw.length} bytes)`);
}

async function main(): Promise<void> {
  await waitForDb();
  console.log("Connected to database");

  const server = new SMTPServer({
    authOptional: false,
    disabledCommands: ["STARTTLS"],
    hideSTARTTLS: true,
    logger: false,
    onAuth(
      auth: SMTPServerAuthentication,
      _session: SMTPServerSession,
      callback: (err: Error | null | undefined, response?: { user?: string }) => void,
    ) {
      void (async () => {
        try {
          if (!auth.username || auth.password == null) {
            callback(new Error("Invalid username or password"));
            return;
          }

          const credential = await findCredential(auth.username);
          if (!credential) {
            callback(new Error("Invalid username or password"));
            return;
          }

          const ok = await bcrypt.compare(auth.password, credential.passwordHash);
          if (!ok) {
            callback(new Error("Invalid username or password"));
            return;
          }

          callback(null, { user: credential.id });
        } catch (error) {
          console.error("Auth error:", error);
          callback(new Error("Authentication failed"));
        }
      })();
    },
    onData(stream, session, callback) {
      const chunks: Buffer[] = [];

      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on("end", () => {
        void (async () => {
          try {
            const credentialId = String(session.user ?? "");
            if (!credentialId) {
              callback(new Error("Unauthenticated"));
              return;
            }

            const raw = Buffer.concat(chunks);
            await storeEmail({ credentialId, raw });
            callback();
          } catch (error) {
            console.error("Failed to store email:", error);
            callback(new Error("Failed to store message"));
          }
        })();
      });
    },
  });

  server.listen(SMTP_PORT, "0.0.0.0", () => {
    console.log(`localfakemail SMTP listening on 0.0.0.0:${SMTP_PORT}`);
  });

  const shutdown = () => {
    console.log("Shutting down SMTP server...");
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  };

  process.on("SIGTERM", () => {
    shutdown();
  });
  process.on("SIGINT", () => {
    shutdown();
  });
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
