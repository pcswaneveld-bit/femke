import { NextRequest } from "next/server";
import { list } from "@vercel/blob";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const since = parseInt(req.nextUrl.searchParams.get("since") ?? "0", 10);

  const { blobs } = await list({ prefix: `mobiel/${sessionId}/` });
  blobs.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());

  const allUrls = blobs.map((b) => b.url);
  const nieuweUrls = allUrls.slice(since);

  return Response.json({ images: nieuweUrls, total: allUrls.length });
}
