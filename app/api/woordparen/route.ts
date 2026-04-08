import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: Request) {
  const { tekst } = await request.json() as { tekst: string };

  if (!tekst?.trim()) {
    return Response.json({ paren: [] });
  }

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `De onderstaande tekst komt uit een schoolboek voor een vreemde taal. Haal alle woorden of korte uitdrukkingen uit de vreemde taal (niet-Nederlands) en geef bij elk woord de Nederlandse vertaling.

Geef je antwoord ALLEEN als geldig JSON array in dit formaat (geen tekst erbuiten, maximaal 30 paren):
[{"vreemd":"bonjour","nederlands":"goedendag"},{"vreemd":"merci","nederlands":"dank je"}]

Tekst:
${tekst}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "[]";
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const paren = JSON.parse(cleaned);
    return Response.json({ paren });
  } catch {
    return Response.json({ paren: [] });
  }
}
