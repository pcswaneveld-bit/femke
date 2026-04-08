import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: Request) {
  const body = await request.json() as {
    stof?: string;
    paginas?: { pagina: number; tekst: string }[];
    antwoorden?: { vraag: string; antwoord: string; pagina?: number }[];
  };

  const { stof, paginas, antwoorden } = body;

  if (!stof && !paginas) {
    return Response.json({ error: "Geen stof meegegeven" }, { status: 400 });
  }

  // ── Mode 1: genereer vragen ──────────────────────────────────────────────

  if (!antwoorden) {

    // Per-pagina modus: genereer minimaal 5 vragen per pagina
    if (paginas && paginas.length > 0) {
      const alleVragen: { vraag: string; pagina: number }[] = [];

      for (const p of paginas) {
        const aantalWoorden = p.tekst.split(/\s+/).length;
        // Min 5 vragen, meer bij rijkere tekst (1 extra per ~100 woorden boven 200)
        const doelAantal = Math.min(12, Math.max(5, Math.floor(aantalWoorden / 100)));

        const message = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `Je bent een leraar die een scholier overhoort over pagina ${p.pagina}. Maak precies ${doelAantal} korte, afwisselende vragen (geen ja/nee) op basis van de onderstaande tekst. Elke vraag test één concreet begrip of feit uit de tekst.

Geef je antwoord ALLEEN als JSON array van strings, geen tekst erbuiten:
["vraag 1","vraag 2",...]

Tekst pagina ${p.pagina}:
${p.tekst}`,
          }],
        });

        const raw = message.content[0].type === "text" ? message.content[0].text : "[]";
        try {
          const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
          const vragen: string[] = JSON.parse(cleaned);
          vragen.forEach((v) => alleVragen.push({ vraag: v, pagina: p.pagina }));
        } catch {
          // skip malformed response for this page
        }
      }

      return Response.json({ vragen: alleVragen.map((v) => v.vraag), paginaPerVraag: alleVragen.map((v) => v.pagina) });
    }

    // Enkelvoudige stof-modus (camera/upload, geen paginaselectie)
    const aantalWoorden = (stof ?? "").split(/\s+/).length;
    const doelAantal = Math.min(15, Math.max(5, Math.floor(aantalWoorden / 100)));

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Je bent een leraar die een leerling overhoort. Maak precies ${doelAantal} korte, afwisselende vragen (geen ja/nee) op basis van de studietekst hieronder.

Geef je antwoord ALLEEN als JSON array van strings, geen tekst erbuiten:
["vraag 1","vraag 2",...]

Studietekst:
${stof}`,
      }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "[]";
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      return Response.json({ vragen: JSON.parse(cleaned), paginaPerVraag: null });
    } catch {
      return Response.json({ vragen: [], paginaPerVraag: null });
    }
  }

  // ── Mode 2: beoordeel antwoorden ────────────────────────────────────────

  const gezamenlijkeStof = stof ?? (paginas ?? []).map((p) => `[Pagina ${p.pagina}]\n${p.tekst}`).join("\n\n");

  const beoordelingPrompt = antwoorden
    .map((a, i) => `Vraag ${i + 1}${a.pagina ? ` (pagina ${a.pagina})` : ""}: ${a.vraag}\nAntwoord leerling: ${a.antwoord}`)
    .join("\n\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `Je bent een vriendelijke leraar die antwoorden van een scholier beoordeelt. Geef per vraag feedback: correct, gedeeltelijk of fout. Geef het juiste antwoord als de leerling het mis had. Sluit af met een motiverende zin en totaalscore.

Geef je antwoord ALLEEN als geldig JSON in dit formaat (geen tekst erbuiten):
{"beoordelingen":[{"correct":true,"feedback":"...","juistAntwoord":"..."}],"score":4,"totaal":5,"slotwoord":"..."}

Studietekst:
${gezamenlijkeStof}

Te beoordelen antwoorden:
${beoordelingPrompt}`,
    }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    return Response.json(JSON.parse(cleaned));
  } catch {
    return Response.json({ error: "Kon de beoordeling niet verwerken" }, { status: 500 });
  }
}
