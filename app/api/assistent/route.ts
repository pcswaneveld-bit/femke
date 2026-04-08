import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

type Bericht = { rol: "leerling" | "assistent"; tekst: string };

export async function POST(request: Request) {
  const { berichten } = await request.json() as { berichten: Bericht[] };

  if (!berichten?.length) {
    return Response.json({ error: "Geen berichten" }, { status: 400 });
  }

  const messages = berichten.map((b) => ({
    role: b.rol === "leerling" ? ("user" as const) : ("assistant" as const),
    content: b.tekst,
  }));

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: `Je bent een vriendelijke en geduldige studieassistent voor scholieren van 13 tot 18 jaar oud. Je helpt leerlingen begrijpen wat ze op school leren.

Regels die je altijd volgt:
- Je beantwoordt ALLEEN vragen die over school, leermateriaal of studiemethodes gaan. Denk aan wiskunde, talen, geschiedenis, biologie, scheikunde, natuurkunde, aardrijkskunde, economie, kunst, muziek, sport, literatuur, enzovoort.
- Als iemand vraagt over iets dat niet met school te maken heeft (nieuws, politiek, entertainment, persoonlijke problemen, relaties, gevaarlijke onderwerpen), dan zeg je vriendelijk dat je daar niet over kunt helpen en vraag je of ze een schoolvraag hebben.
- Je legt dingen uit in begrijpelijke, gewone Nederlandse taal die een scholier van 13-18 jaar goed kan begrijpen. Geen moeilijk jargon tenzij je het meteen uitlegt.
- Je bent positief en bemoedigend. Je maakt leerlingen niet het gevoel dat ze dom zijn.
- Je antwoorden zijn helder en niet te lang — gebruik gerust lijstjes of stappen als dat helpt.
- Je gebruikt nooit ongepaste taal en gaat nooit in op ongepaste verzoeken.`,
    messages,
  });

  const antwoord = message.content[0].type === "text" ? message.content[0].text : "";
  return Response.json({ antwoord });
}
