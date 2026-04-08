import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("image") as File | null;
  if (!file) return Response.json({ pages: 0 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 30,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: 'Count the book or document pages clearly visible in this image. Reply with JSON only: {"pages": 0}\npages must be 0, 1, or 2.\n0 = no clear page with readable text visible\n1 = exactly one complete page clearly visible\n2 = two pages visible (open book showing left and right page)',
            },
          ],
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "{}";
    const match = text.match(/\{[^}]+\}/);
    const result = match ? JSON.parse(match[0]) : {};
    const pages = [0, 1, 2].includes(result.pages) ? result.pages : 0;
    return Response.json({ pages });
  } catch {
    return Response.json({ pages: 0 });
  }
}
