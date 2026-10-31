import { claveDe, hoy, sumarDias } from "@/lib/fechas";
import {
  CupoTomado, type Almuerzo, type Barrio, type BarrioCtx, type BarrioPublico, type Companerismo, type DatosBarrio,
  type MiBarrio, type Miembro, type Repo, type Reserva, type Rol,
} from "@/lib/tipos";

/**
 * Modo demo: sin Supabase, todo vive en el navegador (localStorage).
 * Sirve para ver y probar la app completa; mismas reglas que el servidor.
 */

const CLAVE = "am_local_v1";
const EVENTO = "am-local-cambio";
const YO = "local-yo";

interface Fila extends Almuerzo {
  barrioId: string;
  estado: "reservado" | "cancelado";
}
interface Estado {
  barrios: Barrio[];
  roles: Record<string, Rol>; // slug -> mi rol
  codigos: Record<string, string>; // slug -> código de misioneros
  miembros: Record<string, Miembro[]>; // slug -> otros miembros
  almuerzos: Fila[];
  nombre: string;
}

function sembrar(): Estado {
  // Los días del seed son los próximos días con almuerzo (no domingo ni lunes)
  const habiles: string[] = [];
  for (let n = 1; habiles.length < 6; n++) {
    const dia = sumarDias(hoy(), n);
    if (![0, 1].includes(dia.getDay())) habiles.push(claveDe(dia));
  }
  const d = (n: number) => habiles[n - 1];
  const comps: Companerismo[] = [
    { id: "c-eld", nombre: "Élderes Ramírez y Soto", tipo: "elderes" },
    { id: "c-her", nombre: "Hermanas Vargas y Lee", tipo: "hermanas" },
  ];
  const barrio: Barrio = {
    id: "b-demo",
    slug: "demo",
    nombre: "Barrio Las Compañías",
    direccionCapilla: "Av. Las Compañías 1200, La Serena",
    encargadoNombre: "Hna. Carolina Pérez",
    telefonoEncargado: "+56 9 5555 0101",
    telefonoMisioneros: "+56 9 5555 0202",
    direccionPension: "Los Aromos 1450, depto. 3, La Serena",
    ventana: "13:00 – 15:00",
    alergias: "Élder Soto: alérgico a los mariscos.",
    diasSinAlmuerzo: [0, 1],
    guiasPresidente: "",
    companerismos: comps,
  };
  const f = (n: number, comp: number, familia: string, modo: Almuerzo["modo"], hora: string, lugar: string, extra: Partial<Fila> = {}): Fila => ({
    id: `a-${n}-${comp}`,
    barrioId: barrio.id,
    estado: "reservado",
    fecha: d(n),
    companerismoId: comps[comp].id,
    familia,
    modo,
    hora,
    miembroConfirmo: false,
    misionConfirmo: false,
    creadoPor: `otro-${familia}`,
    telefono: "+56 9 5555 03" + String(10 + n),
    lugar,
    adultoPresente: modo === "casa" ? "Hno. " + familia.replace("Familia ", "") : "",
    notas: "",
    ...extra,
  });
  return {
    barrios: [barrio],
    roles: { demo: "encargado" },
    codigos: { demo: "A1B2C3D4" },
    miembros: {
      demo: [
        { userId: "u-1", nombre: "Hno. Matías Rojas", rol: "miembro" },
        { userId: "u-2", nombre: "Hna. Daniela Fuentes", rol: "miembro" },
        { userId: "u-3", nombre: "Élder Ramírez", rol: "misionero" },
      ],
    },
    almuerzos: [
      f(1, 0, "Familia Rojas", "casa", "13:30", "Av. del Mar 220", { miembroConfirmo: true, notas: "Pastel de choclo." }),
      f(1, 1, "Familia Fuentes", "retiro", "14:00", "Cisternas 80"),
      f(2, 0, "Familia Araya", "entrega", "13:15", "Los Aromos 1450, depto. 3"),
      f(3, 0, "Familia Muñoz", "casa", "13:30", "Brasil 710", { creadoPor: YO, familia: "Familia Muñoz" }),
      f(4, 1, "Familia Castillo", "casa", "14:00", "Rengifo 55"),
      f(5, 0, "Familia Herrera", "retiro", "13:45", "Colo Colo 301"),
    ],
    nombre: "Demo",
  };
}

function leer(): Estado {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) return JSON.parse(crudo) as Estado;
  } catch { /* se siembra de nuevo */ }
  const e = sembrar();
  escribir(e, false);
  return e;
}

function escribir(e: Estado, avisar = true) {
  try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch { /* sin almacenamiento */ }
  if (avisar) window.dispatchEvent(new Event(EVENTO));
}

const id = () => Math.random().toString(36).slice(2, 10);
const slugDe = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "barrio";

const sinTildes = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const aPublico = (b: Barrio): BarrioPublico => ({
  slug: b.slug, nombre: b.nombre, unidad: b.unidad ?? null, direccion: b.direccionCapilla ?? "",
});

/** Solo modo demo: cambiar de rol para ver cada vista. */
export function rolDemo(slug: string): Rol {
  return leer().roles[slug] ?? "miembro";
}
export function cambiarRolDemo(slug: string, rol: Rol) {
  const e = leer();
  e.roles[slug] = rol;
  escribir(e);
}
export function reiniciarDemo() {
  escribir(sembrar());
}

export function repoLocal(): Repo {
  const barrioDe = (e: Estado, slug: string) => e.barrios.find((b) => b.slug === slug);

  return {
    modo: "local",

    async sesion() {
      return { userId: YO, email: "demo@local", nombre: leer().nombre };
    },
    async entrarConTelefono(nombre, telefono) {
      const e = leer();
      e.nombre = nombre.trim();
      escribir(e);
      return telefono;
    },
    async enviarCodigo() {},
    async verificarCodigo() {},
    async cerrarSesion() {},
    async guardarNombre(nombre) {
      const e = leer();
      e.nombre = nombre.trim();
      escribir(e);
    },

    async misBarrios(): Promise<MiBarrio[]> {
      const e = leer();
      return e.barrios.filter((b) => e.roles[b.slug]).map((b) => ({ slug: b.slug, nombre: b.nombre, rol: e.roles[b.slug] }));
    },
    async barrioPublico(slug) {
      const b = barrioDe(leer(), slug);
      return b ? aPublico(b) : null;
    },
    async buscarBarrios(texto) {
      const t = texto.trim();
      const barrios = leer().barrios;
      if (/^\d{4,9}$/.test(t)) return barrios.filter((b) => b.unidad === t).map(aPublico);
      const q = sinTildes(t);
      if (q.length < 3) return [];
      return barrios.filter((b) => sinTildes(b.nombre).includes(q)).slice(0, 8).map(aPublico);
    },
    async crearBarrio({ nombre, unidad, direccion }) {
      const e = leer();
      if (unidad && e.barrios.some((b) => b.unidad === unidad)) {
        throw new Error("Ese barrio ya está creado. Búscalo en el inicio y entra desde ahí.");
      }
      let slug = slugDe(nombre);
      for (let n = 2; barrioDe(e, slug); n++) slug = `${slugDe(nombre)}-${n}`;
      e.barrios.push({
        id: "b-" + id(), slug, nombre: nombre.trim(), unidad, direccionCapilla: direccion ?? "",
        encargadoNombre: "", telefonoEncargado: "", telefonoMisioneros: "",
        direccionPension: "", ventana: "13:00 – 15:00", alergias: "", diasSinAlmuerzo: [], guiasPresidente: "",
        companerismos: [{ id: "c-" + id(), nombre: "Élderes", tipo: "elderes" }],
      });
      e.roles[slug] = "encargado";
      e.codigos[slug] = id().toUpperCase().slice(0, 8);
      e.miembros[slug] = [];
      escribir(e);
      return slug;
    },
    async unirse(slug, codigo) {
      const e = leer();
      if (!barrioDe(e, slug)) throw new Error("Barrio no encontrado");
      if (codigo && codigo.trim().toUpperCase() !== e.codigos[slug]) throw new Error("Código incorrecto");
      if (!e.roles[slug]) e.roles[slug] = codigo ? "misionero" : "miembro";
      else if (e.roles[slug] === "miembro" && codigo) e.roles[slug] = "misionero";
      escribir(e);
      return e.roles[slug];
    },
    async salirDeBarrio(barrioId) {
      const e = leer();
      const b = e.barrios.find((x) => x.id === barrioId);
      if (!b) return;
      if (e.almuerzos.some((a) => a.barrioId === barrioId && a.creadoPor === YO && a.estado === "reservado" && a.fecha >= claveDe(hoy()))) {
        throw new Error("Tienes almuerzos anotados en este barrio. Libéralos antes de salir.");
      }
      delete e.roles[b.slug];
      escribir(e);
    },
    async cargarBarrio(slug): Promise<BarrioCtx | null> {
      const e = leer();
      const barrio = barrioDe(e, slug);
      if (!barrio || !e.roles[slug]) return null;
      return { barrio, rol: e.roles[slug] };
    },
    async guardarBarrio(bid, datos: DatosBarrio, comps) {
      const e = leer();
      const b = e.barrios.find((x) => x.id === bid);
      if (!b) return;
      const usados = new Set(e.almuerzos.filter((a) => a.barrioId === bid && a.estado === "reservado").map((a) => a.companerismoId));
      const quedan = new Set(comps.map((c) => c.id));
      if (b.companerismos.some((c) => usados.has(c.id) && !quedan.has(c.id))) {
        throw new Error("Un compañerismo con almuerzos anotados no se puede quitar.");
      }
      Object.assign(b, datos);
      b.companerismos = comps.map((c) => ({ ...c, id: c.id || "c-" + id() }));
      escribir(e);
    },

    async almuerzos(barrio, rol, desde) {
      const e = leer();
      return e.almuerzos
        .filter((a) => a.barrioId === barrio.id && a.estado === "reservado" && a.fecha >= desde)
        .map(({ barrioId: _b, estado: _s, ...a }) => {
          const ve = a.creadoPor === YO || rol === "encargado" || rol === "misionero";
          return ve ? a : { ...a, telefono: undefined, lugar: undefined, adultoPresente: undefined, notas: undefined };
        });
    },
    suscribir(_barrioId, alCambiar) {
      window.addEventListener(EVENTO, alCambiar);
      window.addEventListener("storage", alCambiar);
      return () => {
        window.removeEventListener(EVENTO, alCambiar);
        window.removeEventListener("storage", alCambiar);
      };
    },
    async reservar(r: Reserva) {
      const e = leer();
      const barrio = e.barrios.find((b) => b.companerismos.some((c) => c.id === r.companerismoId));
      if (!barrio) throw new Error("Compañerismo no encontrado");
      if (e.roles[barrio.slug] === "misionero") throw new Error("No puedes anotarte en este barrio");
      if (e.almuerzos.some((a) => a.barrioId === barrio.id && a.fecha === r.fecha && a.companerismoId === r.companerismoId && a.estado === "reservado")) {
        throw new CupoTomado();
      }
      e.almuerzos.push({
        id: "a-" + id(), barrioId: barrio.id, estado: "reservado", fecha: r.fecha, companerismoId: r.companerismoId,
        familia: r.familia, modo: r.modo, hora: r.hora, miembroConfirmo: false, misionConfirmo: false, creadoPor: YO,
        telefono: r.telefono, lugar: r.lugar, adultoPresente: r.adultoPresente, notas: r.notas,
      });
      escribir(e);
    },
    async confirmarMiembro(aid) {
      const e = leer();
      const a = e.almuerzos.find((x) => x.id === aid);
      if (!a || a.creadoPor !== YO) throw new Error("No puedes confirmar este almuerzo");
      a.miembroConfirmo = true;
      escribir(e);
    },
    async confirmarMision(aid) {
      const e = leer();
      const a = e.almuerzos.find((x) => x.id === aid);
      if (!a) return;
      a.misionConfirmo = true;
      escribir(e);
    },
    async liberar(aid) {
      const e = leer();
      const a = e.almuerzos.find((x) => x.id === aid);
      if (!a) return;
      a.estado = "cancelado";
      escribir(e);
    },

    async codigoMisioneros(barrioId) {
      const e = leer();
      const b = e.barrios.find((x) => x.id === barrioId);
      return (b && e.codigos[b.slug]) || "";
    },
    async regenerarCodigo(barrioId) {
      const e = leer();
      const b = e.barrios.find((x) => x.id === barrioId);
      if (!b) return "";
      e.codigos[b.slug] = id().toUpperCase().slice(0, 8);
      escribir(e);
      return e.codigos[b.slug];
    },
    async miembros(barrioId) {
      const e = leer();
      const b = e.barrios.find((x) => x.id === barrioId);
      return b ? [{ userId: YO, nombre: (e.nombre || "Tú") + " (tú)", rol: e.roles[b.slug] }, ...(e.miembros[b.slug] ?? [])] : [];
    },
    async cambiarRol(barrioId, userId, rol) {
      const e = leer();
      const b = e.barrios.find((x) => x.id === barrioId);
      if (!b) return;
      if (userId === YO) e.roles[b.slug] = rol;
      else (e.miembros[b.slug] ?? []).forEach((m) => { if (m.userId === userId) m.rol = rol; });
      escribir(e);
    },
  };
}
