import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

export function generateUsername(): string {
  return `lfm_${randomBytes(8).toString("hex")}`;
}

export function generatePassword(): string {
  return randomBytes(24).toString("base64url");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function laravelEnvSnippet(params: {
  username: string;
  password: string;
  host?: string;
  port?: string | number;
}): string {
  const host = params.host ?? process.env.SMTP_HOST ?? "127.0.0.1";
  const port = params.port ?? process.env.SMTP_PORT ?? "1025";

  return [
    "MAIL_MAILER=smtp",
    `MAIL_HOST=${host}`,
    `MAIL_PORT=${port}`,
    `MAIL_USERNAME=${params.username}`,
    `MAIL_PASSWORD=${params.password}`,
    "MAIL_ENCRYPTION=null",
    'MAIL_FROM_ADDRESS="hello@example.com"',
    'MAIL_FROM_NAME="${APP_NAME}"',
  ].join("\n");
}

export function fingerprintSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").slice(0, 12);
}
