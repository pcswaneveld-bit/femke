const KEY = "studiehulp_log";
const MAX_ENTRIES = 1000;

export type LogEntry = {
  id: string;
  timestamp: string; // ISO
  bericht: string;
};

export function getLog(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addLog(bericht: string): void {
  if (typeof window === "undefined") return;
  const entries = getLog();
  entries.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    bericht,
  });
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function clearLog(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function formatLogTijd(iso: string): string {
  const d = new Date(iso);
  const dag = String(d.getDate()).padStart(2, "0");
  const maand = String(d.getMonth() + 1).padStart(2, "0");
  const jaar = d.getFullYear();
  const uur = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dag}-${maand}-${jaar} | ${uur}:${min}`;
}
