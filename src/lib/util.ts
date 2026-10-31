export function wa(telefono: string | undefined, texto: string): string {
  return `https://wa.me/${String(telefono || "").replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}

export function guardar(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch { /* sin almacenamiento: la app sigue igual */ }
}

export function leer(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}

export function mensajeDe(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}
