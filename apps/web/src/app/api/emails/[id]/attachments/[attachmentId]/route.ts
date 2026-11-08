import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id, attachmentId } = await params;

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, emailId: id },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = Buffer.from(attachment.content);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": attachment.contentType,
      "Content-Length": String(attachment.size),
      "Content-Disposition": `attachment; filename="${attachment.filename.replaceAll('"', "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
