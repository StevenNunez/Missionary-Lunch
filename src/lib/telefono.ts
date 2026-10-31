/** Dominio interno de las cuentas creadas con número de WhatsApp. No recibe correo. */
export const DOMINIO_TEL = "wsp.missionarylunch.test";

/**
 * Deja el número en dígitos con código de país (ej. 56912345678), o null si no parece un celular.
 * Sin "+" se asume Chile: acepta 9 1234 5678, 09 1234 5678 y 56 9 1234 5678.
 */
export function normalizarTelefono(texto: string): string | null {
  const conMas = texto.trim().startsWith("+");
  let d = texto.replace(/\D/g, "");
  if (!conMas) {
    d = d.replace(/^00/, "");
    if (/^0?9\d{8}$/.test(d)) d = "56" + d.replace(/^0/, "");
    else if (!/^56\d{9}$/.test(d) && d.length < 11) return null;
  }
  return d.length >= 10 && d.length <= 15 ? d : null;
}

/** 56912345678 → +56 9 1234 5678 (los demás países, sin espacios). */
export function formatearTelefono(digitos: string): string {
  const m = /^56(9)(\d{4})(\d{4})$/.exec(digitos);
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : `+${digitos}`;
}

export const emailDeTelefono = (digitos: string) => `${digitos}@${DOMINIO_TEL}`;
export const esEmailDeTelefono = (email: string | undefined | null) => !!email && email.endsWith(`@${DOMINIO_TEL}`);
