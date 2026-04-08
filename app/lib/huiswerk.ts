const KEY = "studiehulp_huiswerk";

export type HuiswerkItem = {
  id: string;
  vak: string;
  omschrijving: string;
  deadline: string; // ISO date
  afgerond: boolean;
  aangemaakt: string;
};

function load(): HuiswerkItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(items: HuiswerkItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("huiswerk-updated"));
}

export function getHuiswerk(): HuiswerkItem[] {
  return load();
}

export function addHuiswerk(vak: string, omschrijving: string, deadline: string): HuiswerkItem {
  const nieuw: HuiswerkItem = {
    id: crypto.randomUUID(),
    vak,
    omschrijving,
    deadline,
    afgerond: false,
    aangemaakt: new Date().toISOString(),
  };
  save([...load(), nieuw]);
  return nieuw;
}

export function toggleHuiswerk(id: string): void {
  save(load().map((h) => (h.id === id ? { ...h, afgerond: !h.afgerond } : h)));
}

export function deleteHuiswerk(id: string): void {
  save(load().filter((h) => h.id !== id));
}
