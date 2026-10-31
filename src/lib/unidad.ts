/** Saca el número de unidad de un enlace de "Compartir" del sitio de la Iglesia (…/u/220108/…) o de un número suelto. */
export function extraerUnidad(texto: string): string | null {
  const t = texto.trim();
  const m = t.match(/\/u\/(\d{4,9})(?:\D|$)/) ?? t.match(/^(\d{4,9})$/);
  return m ? m[1] : null;
}
