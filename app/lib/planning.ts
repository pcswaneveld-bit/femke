const KEY = "studiehulp_planning";

export type Toetsmoment = {
  id: string;
  vakNaam: string;
  vakId: string;
  datum: string; // ISO date van de toets
  hoofdstukIds: string[];
};

export type PlanTaak = {
  type: "leren" | "herhalen" | "overhoren";
  hoofdstukNamen: string[];
  omschrijving: string;
  voltooid: boolean;
};

export type PlanDag = {
  datum: string; // ISO date
  taken: PlanTaak[];
};

export type Studieplan = {
  id: string;
  toetsmomentId: string;
  vakNaam: string;
  toetsDatum: string;
  aangemaakt: string;
  dagen: PlanDag[];
};

type PlanningStore = {
  toetsmomenten: Toetsmoment[];
  plannen: Studieplan[];
};

function load(): PlanningStore {
  if (typeof window === "undefined") return { toetsmomenten: [], plannen: [] };
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as PlanningStore;
  } catch {
    return { toetsmomenten: [], plannen: [] };
  }
}

function save(data: PlanningStore): void {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("planning-updated"));
}

export function getToetsmomenten(): Toetsmoment[] {
  return load().toetsmomenten ?? [];
}

export function addToetsmoment(
  vakNaam: string,
  vakId: string,
  datum: string,
  hoofdstukIds: string[]
): Toetsmoment {
  const store = load();
  const nieuw: Toetsmoment = { id: crypto.randomUUID(), vakNaam, vakId, datum, hoofdstukIds };
  store.toetsmomenten = [...(store.toetsmomenten ?? []), nieuw];
  save(store);
  return nieuw;
}

export function deleteToetsmoment(id: string): void {
  const store = load();
  store.toetsmomenten = (store.toetsmomenten ?? []).filter((t) => t.id !== id);
  store.plannen = (store.plannen ?? []).filter((p) => p.toetsmomentId !== id);
  save(store);
}

export function getPlannen(): Studieplan[] {
  return load().plannen ?? [];
}

export function getPlan(toetsmomentId: string): Studieplan | null {
  return (load().plannen ?? []).find((p) => p.toetsmomentId === toetsmomentId) ?? null;
}

export function savePlan(plan: Studieplan): void {
  const store = load();
  const bestaand = (store.plannen ?? []).findIndex((p) => p.toetsmomentId === plan.toetsmomentId);
  if (bestaand >= 0) {
    store.plannen[bestaand] = plan;
  } else {
    store.plannen = [...(store.plannen ?? []), plan];
  }
  save(store);
}

export function markeerTaakVoltooid(
  planId: string,
  datum: string,
  taakIndex: number
): void {
  const store = load();
  const plan = (store.plannen ?? []).find((p) => p.id === planId);
  if (!plan) return;
  const dag = plan.dagen.find((d) => d.datum === datum);
  if (!dag) return;
  dag.taken[taakIndex].voltooid = true;
  save(store);
}

export function herplanVanaf(planId: string, vandaag: string): Studieplan | null {
  const store = load();
  const plan = (store.plannen ?? []).find((p) => p.id === planId);
  if (!plan) return null;
  // Verplaats niet-voltooide taken van het verleden naar vandaag en verder
  const verleden = plan.dagen.filter((d) => d.datum < vandaag && d.taken.some((t) => !t.voltooid));
  const toekomst = plan.dagen.filter((d) => d.datum >= vandaag);
  const openTaken = verleden.flatMap((d) => d.taken.filter((t) => !t.voltooid));
  if (openTaken.length > 0 && toekomst.length > 0) {
    // Voeg open taken toe aan vandaag
    toekomst[0].taken = [...openTaken, ...toekomst[0].taken];
    plan.dagen = [...plan.dagen.filter((d) => d.datum >= vandaag)];
  }
  save(store);
  return plan;
}
