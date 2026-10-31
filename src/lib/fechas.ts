export const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
/** Cuántos días hacia adelante se puede reservar. */
export const HORIZONTE = 60;

const pad = (n: number) => String(n).padStart(2, "0");

export const claveDe = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function leerClave(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function hoy(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sumarDias(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export const largo = (k: string) => {
  const d = leerClave(k);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};

export const corto = (k: string) => {
  const d = leerClave(k);
  return `${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()}`;
};

export function relativo(k: string): string {
  if (k === claveDe(hoy())) return "Hoy";
  if (k === claveDe(sumarDias(hoy(), 1))) return "Mañana";
  return "";
}

export const hhmm = (h: string) => h.slice(0, 5);
