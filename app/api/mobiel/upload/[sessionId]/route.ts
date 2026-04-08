import { NextRequest } from "next/server";
import { put } from "@vercel/blob";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const body = await req.json();
  const { image } = body as { image?: string };

  if (!image) {
    return Response.json({ error: "Geen afbeelding" }, { status: 400 });
  }

  const [header, data] = image.split(",");
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch?.[1] ?? "image/jpeg";
  const buffer = Buffer.from(data, "base64");

  await put(`mobiel/${sessionId}/${Date.now()}`, buffer, {
    access: "public",
    contentType: mimeType,
  });

  return Response.json({ ok: true });
}
