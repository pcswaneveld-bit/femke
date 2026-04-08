export type Samenvatting = {
  id: string;
  paginanummer: number;
  inhoud: string;
  volledigeTekst?: string;
  aangemaakt: string;
};

export type Hoofdstuk = {
  id: string;
  naam: string;
  samenvattingen: Samenvatting[];
};

export type Vak = {
  id: string;
  naam: string;
  kleur: string;
  hoofdstukken: Hoofdstuk[];
};

const KEY = "studiehulp_vakken";

const KLEUREN = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-red-500",
  "bg-yellow-500",
];

export function getVakken(): Vak[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveVakken(vakken: Vak[]): void {
  localStorage.setItem(KEY, JSON.stringify(vakken));
  window.dispatchEvent(new CustomEvent("vakken-updated"));
}

export function addVak(naam: string): Vak {
  const vakken = getVakken();
  const kleur = KLEUREN[vakken.length % KLEUREN.length];
  const vak: Vak = { id: crypto.randomUUID(), naam, kleur, hoofdstukken: [] };
  saveVakken([...vakken, vak]);
  return vak;
}

export function updateVakNaam(vakId: string, naam: string): void {
  saveVakken(getVakken().map((v) => (v.id === vakId ? { ...v, naam } : v)));
}

export function deleteVak(vakId: string): void {
  saveVakken(getVakken().filter((v) => v.id !== vakId));
}

export function addHoofdstuk(vakId: string, naam: string): Hoofdstuk {
  const hoofdstuk: Hoofdstuk = { id: crypto.randomUUID(), naam, samenvattingen: [] };
  saveVakken(
    getVakken().map((v) =>
      v.id === vakId ? { ...v, hoofdstukken: [...v.hoofdstukken, hoofdstuk] } : v
    )
  );
  return hoofdstuk;
}

export function updateHoofdstukNaam(vakId: string, hoofdstukId: string, naam: string): void {
  saveVakken(
    getVakken().map((v) =>
      v.id === vakId
        ? {
            ...v,
            hoofdstukken: v.hoofdstukken.map((h) =>
              h.id === hoofdstukId ? { ...h, naam } : h
            ),
          }
        : v
    )
  );
}

export function deleteHoofdstuk(vakId: string, hoofdstukId: string): void {
  saveVakken(
    getVakken().map((v) =>
      v.id === vakId
        ? { ...v, hoofdstukken: v.hoofdstukken.filter((h) => h.id !== hoofdstukId) }
        : v
    )
  );
}

export function addSamenvatting(
  vakId: string,
  hoofdstukId: string,
  paginanummer: number,
  inhoud: string,
  volledigeTekst?: string
): Samenvatting {
  const samenvatting: Samenvatting = {
    id: crypto.randomUUID(),
    paginanummer,
    inhoud,
    volledigeTekst,
    aangemaakt: new Date().toISOString(),
  };
  saveVakken(
    getVakken().map((v) =>
      v.id === vakId
        ? {
            ...v,
            hoofdstukken: v.hoofdstukken.map((h) =>
              h.id === hoofdstukId
                ? { ...h, samenvattingen: [...h.samenvattingen, samenvatting] }
                : h
            ),
          }
        : v
    )
  );
  return samenvatting;
}

// ── Cijfers ──────────────────────────────────────────────────────────────────

export type Cijfer = {
  id: string;
  vakNaam: string;
  toets: string;
  cijfer: number;
  weging: number; // hoe vaak telt het mee (1-5)
  datum: string; // ISO date string
};

const CIJFERS_KEY = "studiehulp_cijfers";

export function getCijfers(): Cijfer[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CIJFERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveCijfers(cijfers: Cijfer[]): void {
  localStorage.setItem(CIJFERS_KEY, JSON.stringify(cijfers));
  window.dispatchEvent(new CustomEvent("cijfers-updated"));
}

export function addCijfer(
  vakNaam: string,
  toets: string,
  cijfer: number,
  datum: string,
  weging: number = 1
): Cijfer {
  const nieuw: Cijfer = { id: crypto.randomUUID(), vakNaam, toets, cijfer, weging, datum };
  saveCijfers([...getCijfers(), nieuw]);
  return nieuw;
}

export function deleteCijfer(id: string): void {
  saveCijfers(getCijfers().filter((c) => c.id !== id));
}

// ── Samenvattingen ────────────────────────────────────────────────────────────

export function deleteSamenvatting(
  vakId: string,
  hoofdstukId: string,
  samenvattingId: string
): void {
  saveVakken(
    getVakken().map((v) =>
      v.id === vakId
        ? {
            ...v,
            hoofdstukken: v.hoofdstukken.map((h) =>
              h.id === hoofdstukId
                ? { ...h, samenvattingen: h.samenvattingen.filter((s) => s.id !== samenvattingId) }
                : h
            ),
          }
        : v
    )
  );
}
