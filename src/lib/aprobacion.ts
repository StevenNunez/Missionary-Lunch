import { createHmac, timingSafeEqual } from "crypto";

/**
 * Firma del enlace de aprobación que Teo Labs recibe por correo.
 * Va ligada al barrio: con el enlace de uno no se puede decidir sobre otro.
 */
export function firmarAprobacion(slug: string): string {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) throw new Error("Falta CRON_SECRET");
  return createHmac("sha256", secreto).update(`aprobar-barrio:${slug}`).digest("hex").slice(0, 40);
}

export function firmaValida(slug: string, firma: string): boolean {
  if (!process.env.CRON_SECRET || !firma) return false;
  const esperada = Buffer.from(firmarAprobacion(slug));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}
