import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: Request) {
  const { vakNaam, toetsDatum, vandaag, hoofdstukken } = await request.json() as {
    vakNaam: string;
    toetsDatum: string;
    vandaag: string;
    hoofdstukken: { naam: string; aantalSamenvattingen: number }[];
  };

  const dagenTotToets = Math.max(
    1,
    Math.ceil((new Date(toetsDatum).getTime() - new Date(vandaag).getTime()) / (1000 * 60 * 60 * 24))
  );

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Je maakt een studieplan voor een scholier van 13-18 jaar voor het vak ${vakNaam}.

Toets is op: ${toetsDatum}
Vandaag is: ${vandaag}
Dagen beschikbaar: ${dagenTotToets}
Beschikbare hoofdstukken (met aantal gescande pagina's):
${hoofdstukken.map((h, i) => `${i + 1}. ${h.naam} (${h.aantalSamenvattingen} pagina${h.aantalSamenvattingen !== 1 ? "'s" : ""})`).join("\n")}

Maak een slim studieplan met deze regels:
- Verdeel de stof logisch over de beschikbare dagen
- Eerste dagen: nieuwe stof leren
- Halverwege: mix van nieuwe stof + eerder geleerde stof herhalen
- Laatste 1-2 dagen voor de toets: ALLEEN herhalen en overhoren, geen nieuwe stof
- Als er maar 1-2 dagen zijn: dag 1 leren/herhalen, dag 2 overhoren
- Elk hoofdstuk moet minstens 1 keer herhaald worden na de eerste kennismaking
- Type "leren" = eerste keer een hoofdstuk doornemen
- Type "herhalen" = eerder gezien materiaal opnieuw bekijken
- Type "overhoren" = AI stelt vragen, alleen op het einde of bij herhalingen

Geef je antwoord ALLEEN als geldig JSON (geen tekst erbuiten):
{
  "dagen": [
    {
      "datum": "YYYY-MM-DD",
      "taken": [
        {
          "type": "leren",
          "hoofdstukNamen": ["Hoofdstuk 1"],
          "omschrijving": "Lees pagina's X t/m Y van Hoofdstuk 1. Focus op begrippen A, B en C."
        }
      ]
    }
  ]
}

Genereer één dag per datum, startend vanaf ${vandaag} tot en met de dag vóór de toets (${toetsDatum} zelf is de toets, niet studeren).`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    return Response.json(JSON.parse(cleaned));
  } catch {
    return Response.json({ error: "Kon het plan niet genereren" }, { status: 500 });
  }
}
