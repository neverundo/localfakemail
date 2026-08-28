import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Address, EmailListItem } from "@/lib/types";

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

export async function GET() {
  const emails = await prisma.email.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      from: true,
      to: true,
      subject: true,
      size: true,
      readAt: true,
      createdAt: true,
      htmlBody: true,
      _count: { select: { attachments: true } },
    },
  });

  const payload: EmailListItem[] = emails.map((email) => ({
    id: email.id,
    from: email.from,
    to: asAddresses(email.to),
    subject: email.subject,
    size: email.size,
    readAt: email.readAt?.toISOString() ?? null,
    createdAt: email.createdAt.toISOString(),
    hasHtml: Boolean(email.htmlBody),
    attachmentCount: email._count.attachments,
  }));

  return NextResponse.json({ emails: payload });
}

export async function DELETE() {
  await prisma.email.deleteMany();
  return NextResponse.json({ ok: true });
}
