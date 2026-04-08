import { NextRequest } from "next/server";
import { getSessie } from "../../../../lib/mobileSessie";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const sessie = getSessie(sessionId);

  if (!sessie) {
    return Response.json({ error: "Sessie niet gevonden" }, { status: 404 });
  }

  // ?since=N — return only images at index >= N
  const since = parseInt(req.nextUrl.searchParams.get("since") ?? "0", 10);
  const nieuweImages = sessie.images.slice(since);
  const total = sessie.images.length;

  return Response.json({ images: nieuweImages, total });
}
