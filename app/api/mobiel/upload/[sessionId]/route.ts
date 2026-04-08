import { NextRequest } from "next/server";
import { addImage } from "../../../../lib/mobileSessie";

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

  const ok = addImage(sessionId, image);
  if (!ok) {
    return Response.json({ error: "Sessie niet gevonden of verlopen" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
