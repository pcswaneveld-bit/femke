// Server-only module — do not import in client components

export interface MobileSessie {
  id: string;
  aangemaakt: number;
  images: string[]; // base64 data URLs, in order received
}

declare global {
  // eslint-disable-next-line no-var
  var _mobileSessies: Map<string, MobileSessie> | undefined;
}

const sessies: Map<string, MobileSessie> = global._mobileSessies ?? new Map();
global._mobileSessies = sessies;

function cleanup() {
  const tienMinuten = 10 * 60 * 1000;
  const nu = Date.now();
  for (const [id, sessie] of sessies) {
    if (nu - sessie.aangemaakt > tienMinuten) sessies.delete(id);
  }
}

export function maakSessie(): MobileSessie {
  cleanup();
  const id = crypto.randomUUID();
  const sessie: MobileSessie = { id, aangemaakt: Date.now(), images: [] };
  sessies.set(id, sessie);
  return sessie;
}

export function getSessie(id: string): MobileSessie | undefined {
  return sessies.get(id);
}

export function addImage(id: string, image: string): boolean {
  const sessie = sessies.get(id);
  if (!sessie) return false;
  sessie.images.push(image);
  return true;
}
