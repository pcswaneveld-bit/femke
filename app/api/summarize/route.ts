import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return Response.json({ error: "Geen afbeelding gevonden" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return Response.json(
      { error: "Alleen JPEG, PNG, GIF en WebP zijn toegestaan" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: `Je bent een studieassistent voor scholieren. Bekijk deze leerboekpagina en doe drie dingen:

1. Schrijf de volledige tekst van de pagina over (volledigeTekst) — zo volledig mogelijk, inclusief alle begrippen, definities en zinnen.
2. Maak een korte studiesamenvatting (samenvatting) gericht op wat een leerling moet kennen voor een toets, in gewone Nederlandse scholierentaal:

**Wat moet je weten?**
Leg in 2-3 zinnen uit waar deze pagina over gaat.

**Dit moet je onthouden:**
Maximaal 5 bulletpoints met de begrippen, feiten of regels die je echt moet kennen. Markeer de belangrijkste woorden **vet**.

**Handige ezelsbruggetje of tip:**
Eén concrete tip om de stof beter te onthouden of te begrijpen.

3. Zoek het paginanummer (paginanummer) — kijk naar de rand of onderkant van de pagina voor een getal. Geef null als je het niet zeker kunt lezen.
4. Probeer het schoolvak te herkennen (vakNaam) — kijk naar de bovenkant van de pagina, de koptekst of de inhoud. Geef een korte Nederlandse vaknaam zoals "Aardrijkskunde", "Geschiedenis", "Biologie", "Scheikunde", "Wiskunde", "Engels", "Frans", "Duits", "Nederlands", "Natuurkunde", "Economie", etc. Geef null als je het niet kunt bepalen.

Geef je antwoord ALLEEN als geldig JSON in precies dit formaat (geen extra tekst erbuiten):
{"volledigeTekst":"...","samenvatting":"...","paginanummer":42,"vakNaam":"Biologie"}`,
          },
        ],
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    // Strip possible markdown code fences
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return Response.json({
      summary: parsed.samenvatting ?? raw,
      volledigeTekst: parsed.volledigeTekst ?? "",
      paginanummer: typeof parsed.paginanummer === "number" ? parsed.paginanummer : null,
      vakNaam: typeof parsed.vakNaam === "string" ? parsed.vakNaam : null,
    });
  } catch {
    // Fallback: treat whole response as summary
    return Response.json({ summary: raw, volledigeTekst: "" });
  }
}
