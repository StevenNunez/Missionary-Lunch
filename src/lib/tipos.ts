export type Rol = "encargado" | "misionero" | "miembro";
export type Tipo = "elderes" | "hermanas";
export type Modo = "casa" | "retiro" | "entrega";

export interface Companerismo {
  id: string;
  nombre: string;
  tipo: Tipo;
}

export interface Barrio {
  id: string;
  slug: string;
  nombre: string;
  encargadoNombre: string;
  telefonoEncargado: string;
  telefonoMisioneros: string;
  direccionPension: string;
  ventana: string;
  alergias: string;
  /** 0 = domingo */
  diasSinAlmuerzo: number[];
  guiasPresidente: string;
  companerismos: Companerismo[];
  /** Número de unidad de la Iglesia; identifica al barrio. */
  unidad?: string;
  direccionCapilla?: string;
  /** Un barrio nuevo está pendiente hasta que Teo Labs lo aprueba; mientras tanto no se puede entrar a él. */
  estado?: "pendiente" | "aprobado";
}

/** Lo único que ve alguien que aún no pertenece al barrio. */
export interface BarrioPublico {
  slug: string;
  nombre: string;
  unidad: string | null;
  direccion: string;
}

export interface Almuerzo {
  id: string;
  fecha: string; // YYYY-MM-DD
  companerismoId: string;
  familia: string;
  modo: Modo;
  hora: string;
  miembroConfirmo: boolean;
  misionConfirmo: boolean;
  creadoPor: string;
  /** Solo los ve la familia, el encargado y los misioneros */
  telefono?: string;
  lugar?: string;
  adultoPresente?: string;
  notas?: string;
}

export interface Reserva {
  companerismoId: string;
  fecha: string;
  familia: string;
  telefono: string;
  modo: Modo;
  hora: string;
  lugar: string;
  adultoPresente: string;
  notas: string;
}

export interface Sesion {
  userId: string;
  email: string;
  /** Solo en cuentas creadas con número de WhatsApp. */
  telefono?: string;
  nombre: string;
}

export interface MiBarrio {
  slug: string;
  nombre: string;
  rol: Rol;
}

export interface Miembro {
  userId: string;
  nombre: string;
  rol: Rol;
}

export interface BarrioCtx {
  barrio: Barrio;
  rol: Rol;
}

export type DatosBarrio = Omit<Barrio, "id" | "slug" | "companerismos" | "unidad" | "direccionCapilla" | "estado">;

/** Lo que el repo necesita para que la interfaz funcione igual con Supabase o en modo demo local. */
export interface Repo {
  modo: "supabase" | "local";
  sesion(): Promise<Sesion | null>;
  /** Ingreso de familias: nombre y número de WhatsApp, sin código. Devuelve el número ya formateado. */
  entrarConTelefono(nombre: string, telefono: string): Promise<string>;
  enviarCodigo(email: string): Promise<void>;
  verificarCodigo(email: string, codigo: string): Promise<void>;
  cerrarSesion(): Promise<void>;
  guardarNombre(nombre: string): Promise<void>;

  misBarrios(): Promise<MiBarrio[]>;
  barrioPublico(slug: string): Promise<BarrioPublico | null>;
  /** Por nombre (mínimo 3 letras) o por número de unidad. */
  buscarBarrios(texto: string): Promise<BarrioPublico[]>;
  crearBarrio(datos: { nombre: string; unidad?: string; direccion?: string }): Promise<string>;
  unirse(slug: string, codigo?: string): Promise<Rol>;
  /** Quita mi rol en el barrio (el historial queda). Falla si soy el único encargado o tengo almuerzos por venir. */
  salirDeBarrio(barrioId: string): Promise<void>;
  cargarBarrio(slug: string): Promise<BarrioCtx | null>;
  guardarBarrio(id: string, datos: DatosBarrio, comps: Companerismo[]): Promise<void>;

  almuerzos(barrio: Barrio, rol: Rol, desde: string): Promise<Almuerzo[]>;
  suscribir(barrioId: string, alCambiar: () => void): () => void;
  reservar(r: Reserva): Promise<void>;
  confirmarMiembro(id: string): Promise<void>;
  confirmarMision(id: string): Promise<void>;
  liberar(id: string): Promise<void>;

  codigoMisioneros(barrioId: string): Promise<string>;
  regenerarCodigo(barrioId: string): Promise<string>;
  miembros(barrioId: string): Promise<Miembro[]>;
  cambiarRol(barrioId: string, userId: string, rol: Rol): Promise<void>;
}

export class CupoTomado extends Error {
  constructor() {
    super("Otra familia acaba de tomar este día.");
  }
}
