import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPreviewDocument } from "@/lib/sanitize";
import type { Address, EmailDetail } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function asAddresses(value: unknown): Address[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== "object") {
      return { name: null, address: null };
    }
    const record = item as Record<string, unknown>;
    return {
      name: typeof record.name === "string" ? record.name : null,
      address: typeof record.address === "string" ? record.address : null,
    };
  });
}

function asHeaders(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = String(entry);
  }
  return result;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const email = await prisma.email.findUnique({
    where: { id },
    include: {
      attachments: {
        select: {
          id: true,
          filename: true,
          contentType: true,
          size: true,
        },
      },
    },
  });

  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!email.readAt) {
    await prisma.email.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  const payload: EmailDetail = {
    id: email.id,
    from: email.from,
    to: asAddresses(email.to),
    cc: asAddresses(email.cc),
    bcc: asAddresses(email.bcc),
    subject: email.subject,
    size: email.size,
    readAt: (email.readAt ?? new Date()).toISOString(),
    createdAt: email.createdAt.toISOString(),
    hasHtml: Boolean(email.htmlBody),
    attachmentCount: email.attachments.length,
    textBody: email.textBody,
    htmlBody: email.htmlBody,
    previewHtml: email.htmlBody ? buildPreviewDocument(email.htmlBody) : null,
    headers: asHeaders(email.headers),
    raw: email.raw,
    messageId: email.messageId,
    attachments: email.attachments,
  };

  return NextResponse.json({ email: payload });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.email.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
