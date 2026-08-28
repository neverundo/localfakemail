import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generatePassword,
  generateUsername,
  hashPassword,
  laravelEnvSnippet,
} from "@/lib/credentials";
import type { CredentialListItem } from "@/lib/types";

export async function GET() {
  const credentials = await prisma.credential.findMany({
    orderBy: { createdAt: "desc" },
  });

  const payload: CredentialListItem[] = credentials.map((credential) => ({
    id: credential.id,
    username: credential.username,
    label: credential.label,
    createdAt: credential.createdAt.toISOString(),
    revokedAt: credential.revokedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ credentials: payload });
}

export async function POST(request: Request) {
  let label: string | null = null;

  try {
    const body = (await request.json()) as { label?: string };
    if (typeof body.label === "string" && body.label.trim()) {
      label = body.label.trim().slice(0, 80);
    }
  } catch {
    // empty body is fine
  }

  const username = generateUsername();
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  const credential = await prisma.credential.create({
    data: {
      username,
      passwordHash,
      label,
    },
  });

  return NextResponse.json({
    credential: {
      id: credential.id,
      username: credential.username,
      label: credential.label,
      createdAt: credential.createdAt.toISOString(),
      revokedAt: null,
    },
    secret: password,
    laravelEnv: laravelEnvSnippet({
      username,
      password,
    }),
  });
}
