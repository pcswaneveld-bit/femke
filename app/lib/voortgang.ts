const KEY = "studiehulp_voortgang";

export type PaginaScore = {
  besteScore: number;   // 0–100 percentage
  aantalSessies: number;
};

export type VoortgangData = {
  aantalSessies: number;           // totaal woorden + overhoring sessies
  aantalOverhoringen: number;
  aantalPerfecteWoorden: number;   // 100% woordjesrondes
  aantalGoedeOverhoringen: number; // >= 80%
  besteOverhoorScore: number;      // 0–100
  verdiendeSterren: string[];
  paginaScores: Record<string, PaginaScore>; // key = paginanummer als string
};

export type Ster = {
  id: string;
  niveau: "brons" | "zilver" | "goud";
  nummer: number;
  naam: string;
  uitleg: string;
  hoeTeVerdienen: string;
  check: (v: VoortgangData) => boolean;
};

export const STERREN: Ster[] = [
  // ── Brons ──────────────────────────────────────────────────────────────────
  {
    id: "b1", niveau: "brons", nummer: 1,
    naam: "Eerste stap",
    uitleg: "Je hebt voor het eerst geoefend. Elke reis begint met één stap!",
    hoeTeVerdienen: "Start je eerste oefensessie — woordjes of overhoring.",
    check: (v) => v.aantalSessies >= 1,
  },
  {
    id: "b2", niveau: "brons", nummer: 2,
    naam: "Op weg",
    uitleg: "Je hebt al 3 keer geoefend. Zo ga je het leren!",
    hoeTeVerdienen: "Oefen in totaal 3 keer (woordjes of overhoring).",
    check: (v) => v.aantalSessies >= 3,
  },
  {
    id: "b3", niveau: "brons", nummer: 3,
    naam: "Eerste overhoring",
    uitleg: "Dapper! Je hebt jezelf voor het eerst laten overhoren.",
    hoeTeVerdienen: "Doe één keer de 'Overhoren' modus.",
    check: (v) => v.aantalOverhoringen >= 1,
  },
  {
    id: "b4", niveau: "brons", nummer: 4,
    naam: "Doorzetter",
    uitleg: "5 oefensessies voltooid. Je bent serieus bezig!",
    hoeTeVerdienen: "Oefen in totaal 5 keer.",
    check: (v) => v.aantalSessies >= 5,
  },
  {
    id: "b5", niveau: "brons", nummer: 5,
    naam: "Halverwege gehaald",
    uitleg: "Meer dan de helft goed bij een overhoring. Goed bezig!",
    hoeTeVerdienen: "Haal 50% of meer bij een overhoring.",
    check: (v) => v.besteOverhoorScore >= 50,
  },

  // ── Zilver ─────────────────────────────────────────────────────────────────
  {
    id: "z1", niveau: "zilver", nummer: 1,
    naam: "Woordjesmeester I",
    uitleg: "Alle woordjes in één ronde goed! Perfecte score!",
    hoeTeVerdienen: "Doe een woordjesronde en typ alle vertalingen correct.",
    check: (v) => v.aantalPerfecteWoorden >= 1,
  },
  {
    id: "z2", niveau: "zilver", nummer: 2,
    naam: "Zesje gehaald",
    uitleg: "60% of meer bij een overhoring. Je kent de stof al goed!",
    hoeTeVerdienen: "Haal 60% of meer bij een overhoring.",
    check: (v) => v.besteOverhoorScore >= 60,
  },
  {
    id: "z3", niveau: "zilver", nummer: 3,
    naam: "Ijverige leerling",
    uitleg: "10 oefensessies voltooid. Echte inzet!",
    hoeTeVerdienen: "Oefen in totaal 10 keer.",
    check: (v) => v.aantalSessies >= 10,
  },
  {
    id: "z4", niveau: "zilver", nummer: 4,
    naam: "Zelftest kampioen",
    uitleg: "Je hebt jezelf al 3 keer laten overhoren. Slim om jezelf te blijven testen!",
    hoeTeVerdienen: "Doe de overhoring 3 keer (mag op verschillende dagen).",
    check: (v) => v.aantalOverhoringen >= 3,
  },
  {
    id: "z5", niveau: "zilver", nummer: 5,
    naam: "Consistent goed",
    uitleg: "3 keer 60% of meer gehaald bij de overhoring. Je zit in een goede flow!",
    hoeTeVerdienen: "Haal 3 keer op rij 60% of meer bij de overhoring.",
    check: (v) => v.aantalGoedeOverhoringen >= 3,
  },

  // ── Goud ───────────────────────────────────────────────────────────────────
  {
    id: "g1", niveau: "goud", nummer: 1,
    naam: "Acht plus!",
    uitleg: "80% of meer bij een overhoring. Bijna een expert — wauw!",
    hoeTeVerdienen: "Haal 80% of meer bij een overhoring.",
    check: (v) => v.besteOverhoorScore >= 80,
  },
  {
    id: "g2", niveau: "goud", nummer: 2,
    naam: "Woordjesmeester II",
    uitleg: "3 keer alle woordjes perfect! Je kent ze door en door.",
    hoeTeVerdienen: "Doe 3 perfecte woordjesrondes (alles goed).",
    check: (v) => v.aantalPerfecteWoorden >= 3,
  },
  {
    id: "g3", niveau: "goud", nummer: 3,
    naam: "Topscorer",
    uitleg: "Meerdere keren 80% of meer gehaald. Consistent topprestaties!",
    hoeTeVerdienen: "Haal 2 keer 80% of meer bij de overhoring.",
    check: (v) => v.aantalGoedeOverhoringen >= 2,
  },
  {
    id: "g4", niveau: "goud", nummer: 4,
    naam: "Marathonloper",
    uitleg: "20 oefensessies voltooid. Jij geeft niet op!",
    hoeTeVerdienen: "Oefen in totaal 20 keer.",
    check: (v) => v.aantalSessies >= 20,
  },
  {
    id: "g5", niveau: "goud", nummer: 5,
    naam: "Volledige meester",
    uitleg: "100% bij een overhoring! Perfect — je bent er helemaal klaar voor!",
    hoeTeVerdienen: "Beantwoord alle vragen bij een overhoring correct.",
    check: (v) => v.besteOverhoorScore >= 100,
  },
];

// ── CRUD ───────────────────────────────────────────────────────────────────────

function getAlleVoortgang(): Record<string, VoortgangData> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveAlleVoortgang(data: Record<string, VoortgangData>): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function leegData(): VoortgangData {
  return {
    aantalSessies: 0,
    aantalOverhoringen: 0,
    aantalPerfecteWoorden: 0,
    aantalGoedeOverhoringen: 0,
    besteOverhoorScore: 0,
    verdiendeSterren: [],
    paginaScores: {},
  };
}

export function getVoortgang(hoofdstukId: string): VoortgangData {
  const data = getAlleVoortgang()[hoofdstukId] ?? leegData();
  // Migrate old records that don't have paginaScores yet
  if (!data.paginaScores) data.paginaScores = {};
  return data;
}

/** Sla een paginascore op na een oefensessie. Score 0–100. */
export function registreerPaginaScores(
  hoofdstukId: string,
  scores: Record<string, number>, // paginanummer → score 0–100
): void {
  const alle = getAlleVoortgang();
  const data: VoortgangData = alle[hoofdstukId] ?? leegData();
  if (!data.paginaScores) data.paginaScores = {};
  for (const [pagina, score] of Object.entries(scores)) {
    const huidig = data.paginaScores[pagina];
    data.paginaScores[pagina] = {
      besteScore: huidig ? Math.max(huidig.besteScore, score) : score,
      aantalSessies: (huidig?.aantalSessies ?? 0) + 1,
    };
  }
  alle[hoofdstukId] = data;
  saveAlleVoortgang(alle);
}

export function getTotaalSterren(): { totaal: number; perNiveau: { brons: number; zilver: number; goud: number } } {
  const alle = getAlleVoortgang();
  let totaal = 0;
  const perNiveau = { brons: 0, zilver: 0, goud: 0 };
  for (const data of Object.values(alle)) {
    for (const sterId of data.verdiendeSterren) {
      const ster = STERREN.find((s) => s.id === sterId);
      if (ster) {
        totaal++;
        perNiveau[ster.niveau]++;
      }
    }
  }
  return { totaal, perNiveau };
}

/** Registreer een woordjesronde. Geeft nieuw verdiende sterren terug. */
export function registreerWoorden(
  hoofdstukId: string,
  aantalGoed: number,
  totaal: number
): Ster[] {
  const alle = getAlleVoortgang();
  const data: VoortgangData = alle[hoofdstukId] ?? leegData();

  data.aantalSessies += 1;
  if (totaal > 0 && aantalGoed === totaal) {
    data.aantalPerfecteWoorden += 1;
  }

  return slaOpEnGeefNieuweTerug(alle, hoofdstukId, data);
}

/** Registreer een overhoring. Geeft nieuw verdiende sterren terug. */
export function registreerOverhoring(
  hoofdstukId: string,
  score: number,
  totaal: number
): Ster[] {
  const alle = getAlleVoortgang();
  const data: VoortgangData = alle[hoofdstukId] ?? leegData();

  const pct = totaal > 0 ? Math.round((score / totaal) * 100) : 0;
  data.aantalSessies += 1;
  data.aantalOverhoringen += 1;
  if (pct > data.besteOverhoorScore) data.besteOverhoorScore = pct;
  if (pct >= 80) data.aantalGoedeOverhoringen += 1;

  return slaOpEnGeefNieuweTerug(alle, hoofdstukId, data);
}

function slaOpEnGeefNieuweTerug(
  alle: Record<string, VoortgangData>,
  hoofdstukId: string,
  data: VoortgangData
): Ster[] {
  const nieuw: Ster[] = [];
  for (const ster of STERREN) {
    if (!data.verdiendeSterren.includes(ster.id) && ster.check(data)) {
      data.verdiendeSterren.push(ster.id);
      nieuw.push(ster);
    }
  }
  alle[hoofdstukId] = data;
  saveAlleVoortgang(alle);
  return nieuw;
}
