import { supabaseBrowser } from "@/lib/supabase/client";
import {
  CupoTomado, type Almuerzo, type Barrio, type BarrioCtx, type BarrioPublico, type Companerismo, type DatosBarrio,
  type MiBarrio, type Miembro, type Repo, type Reserva, type Rol, type Sesion, type Tipo,
} from "@/lib/tipos";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fila = Record<string, any>;

function falla(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.code === "23505") throw new CupoTomado();
  throw new Error(error.message);
}

const aBarrio = (b: Fila, comps: Fila[]): Barrio => ({
  id: b.id,
  slug: b.slug,
  nombre: b.nombre,
  encargadoNombre: b.encargado_nombre,
  telefonoEncargado: b.telefono_encargado,
  telefonoMisioneros: b.telefono_misioneros,
  direccionPension: b.direccion_pension,
  ventana: b.ventana,
  alergias: b.alergias,
  diasSinAlmuerzo: (b.dias_sin_almuerzo ?? []).map(Number),
  guiasPresidente: b.guias_presidente,
  unidad: b.unidad ?? undefined,
  direccionCapilla: b.direccion_capilla,
  estado: b.estado,
  companerismos: [...comps]
    .sort((x, y) => x.orden - y.orden)
    .map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo as Tipo })),
});

const aPublico = (f: Fila): BarrioPublico => ({
  slug: f.slug, nombre: f.nombre, unidad: f.unidad ?? null, direccion: f.direccion ?? "",
});

export function repoSupabase(): Repo {
  const sb = supabaseBrowser();

  return {
    modo: "supabase",

    async sesion(): Promise<Sesion | null> {
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      if (!u) return null;
      const { data: p } = await sb.from("perfiles").select("nombre").eq("id", u.id).maybeSingle();
      const tel = (u.user_metadata as { telefono?: string } | undefined)?.telefono;
      return { userId: u.id, email: u.email ?? "", telefono: tel, nombre: p?.nombre ?? "" };
    },
    async entrarConTelefono(nombre, telefono) {
      const res = await fetch("/api/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; access_token?: string; refresh_token?: string; telefono?: string };
      if (!res.ok || !j.access_token || !j.refresh_token) throw new Error(j.error ?? "No se pudo entrar. Intenta de nuevo.");
      falla((await sb.auth.setSession({ access_token: j.access_token, refresh_token: j.refresh_token })).error);
      return j.telefono ?? telefono;
    },
    async enviarCodigo(email) {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(location.pathname)}` },
      });
      falla(error);
    },
    async verificarCodigo(email, codigo) {
      const { error } = await sb.auth.verifyOtp({ email, token: codigo.trim(), type: "email" });
      falla(error);
    },
    async cerrarSesion() {
      await sb.auth.signOut();
    },
    async guardarNombre(nombre) {
      const { data } = await sb.auth.getUser();
      if (!data.user) throw new Error("Sesión vencida");
      falla((await sb.from("perfiles").upsert({ id: data.user.id, nombre: nombre.trim() })).error);
    },

    async misBarrios(): Promise<MiBarrio[]> {
      const { data, error } = await sb.from("roles_barrio").select("rol, barrios(slug, nombre)");
      falla(error);
      return ((data ?? []) as unknown as Fila[])
        .map((r) => ({ slug: r.barrios.slug, nombre: r.barrios.nombre, rol: r.rol as Rol }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
    async barrioPublico(slug) {
      const { data, error } = await sb.rpc("barrio_publico", { p_slug: slug });
      falla(error);
      const f = (data as Fila[] | null)?.[0];
      return f ? aPublico(f) : null;
    },
    async buscarBarrios(texto) {
      const { data, error } = await sb.rpc("buscar_barrios", { p_texto: texto });
      falla(error);
      return ((data ?? []) as Fila[]).map(aPublico);
    },
    async crearBarrio({ nombre, unidad, direccion }) {
      const { data, error } = await sb.rpc("crear_barrio", {
        p_nombre: nombre, p_unidad: unidad ?? null, p_direccion: direccion ?? "",
      });
      falla(error);
      return data as string;
    },
    async unirse(slug, codigo) {
      const { data, error } = await sb.rpc("unirse_barrio", { p_slug: slug, p_codigo: codigo || null });
      falla(error);
      return data as Rol;
    },
    async salirDeBarrio(barrioId) {
      falla((await sb.rpc("salir_barrio", { p_barrio: barrioId })).error);
    },
    async cargarBarrio(slug): Promise<BarrioCtx | null> {
      const { data: b, error } = await sb.from("barrios").select("*").eq("slug", slug).maybeSingle();
      falla(error);
      if (!b) return null;
      const { data: u } = await sb.auth.getUser();
      const [{ data: comps, error: e2 }, { data: r, error: e3 }] = await Promise.all([
        sb.from("companerismos").select("*").eq("barrio_id", b.id),
        sb.from("roles_barrio").select("rol").eq("barrio_id", b.id).eq("user_id", u.user?.id ?? "").maybeSingle(),
      ]);
      falla(e2);
      falla(e3);
      if (!r) return null;
      return { barrio: aBarrio(b, comps ?? []), rol: r.rol as Rol };
    },
    async guardarBarrio(id, d: DatosBarrio, comps: Companerismo[]) {
      falla(
        (
          await sb.from("barrios").update({
            nombre: d.nombre,
            encargado_nombre: d.encargadoNombre,
            telefono_encargado: d.telefonoEncargado,
            telefono_misioneros: d.telefonoMisioneros,
            direccion_pension: d.direccionPension,
            ventana: d.ventana,
            alergias: d.alergias,
            dias_sin_almuerzo: d.diasSinAlmuerzo,
            guias_presidente: d.guiasPresidente,
            actualizado_en: new Date().toISOString(),
          }).eq("id", id)
        ).error,
      );
      const { data: actuales, error } = await sb.from("companerismos").select("id").eq("barrio_id", id);
      falla(error);
      const conservar = new Set(comps.filter((c) => c.id).map((c) => c.id));
      for (const a of actuales ?? []) {
        if (!conservar.has(a.id)) {
          const r = await sb.from("companerismos").delete().eq("id", a.id);
          if (r.error?.code === "23503") throw new Error("Un compañerismo con almuerzos anotados no se puede quitar.");
          falla(r.error);
        }
      }
      for (const [orden, c] of comps.entries()) {
        const fila = { barrio_id: id, nombre: c.nombre, tipo: c.tipo, orden };
        const r = c.id
          ? await sb.from("companerismos").update(fila).eq("id", c.id)
          : await sb.from("companerismos").insert(fila);
        falla(r.error);
      }
    },

    async almuerzos(barrio, _rol, desde): Promise<Almuerzo[]> {
      const { data, error } = await sb
        .from("almuerzos").select("*").eq("barrio_id", barrio.id).eq("estado", "reservado").gte("fecha", desde);
      falla(error);
      const filas = (data ?? []) as Fila[];
      // RLS decide de quién se devuelve el detalle (la propia familia, encargado y misioneros).
      const detalles = new Map<string, Fila>();
      if (filas.length) {
        const { data: det, error: e2 } = await sb
          .from("almuerzo_detalle").select("*").in("almuerzo_id", filas.map((f) => f.id));
        falla(e2);
        ((det ?? []) as Fila[]).forEach((d) => detalles.set(d.almuerzo_id, d));
      }
      return filas.map((f) => {
        const d = detalles.get(f.id);
        return {
          id: f.id,
          fecha: f.fecha,
          companerismoId: f.companerismo_id,
          familia: f.familia,
          modo: f.modo,
          hora: String(f.hora).slice(0, 5),
          miembroConfirmo: f.miembro_confirmo,
          misionConfirmo: f.mision_confirmo,
          creadoPor: f.creado_por,
          ...(d && { telefono: d.telefono, lugar: d.lugar, adultoPresente: d.adulto_presente, notas: d.notas }),
        };
      });
    },
    suscribir(barrioId, alCambiar) {
      const canal = sb
        .channel(`almuerzos-${barrioId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "almuerzos", filter: `barrio_id=eq.${barrioId}` }, alCambiar)
        .on("postgres_changes", { event: "*", schema: "public", table: "almuerzo_detalle" }, alCambiar)
        .subscribe();
      // Respaldo por si el canal en tiempo real se corta (red móvil, app en segundo plano).
      const timer = setInterval(alCambiar, 30000);
      const alVolver = () => {
        if (document.visibilityState === "visible") alCambiar();
      };
      document.addEventListener("visibilitychange", alVolver);
      return () => {
        clearInterval(timer);
        document.removeEventListener("visibilitychange", alVolver);
        sb.removeChannel(canal);
      };
    },
    async reservar(r: Reserva) {
      const { error } = await sb.rpc("reservar_almuerzo", {
        p_companerismo: r.companerismoId, p_fecha: r.fecha, p_familia: r.familia, p_telefono: r.telefono,
        p_modo: r.modo, p_hora: r.hora, p_lugar: r.lugar, p_adulto: r.adultoPresente, p_notas: r.notas,
      });
      falla(error);
    },
    async confirmarMiembro(id) {
      falla((await sb.rpc("confirmar_miembro", { p_almuerzo: id })).error);
    },
    async confirmarMision(id) {
      falla((await sb.rpc("confirmar_mision", { p_almuerzo: id })).error);
    },
    async liberar(id) {
      falla((await sb.rpc("liberar_almuerzo", { p_almuerzo: id })).error);
    },

    async codigoMisioneros(barrioId) {
      const { data, error } = await sb
        .from("barrio_secretos").select("codigo_misioneros").eq("barrio_id", barrioId).single();
      falla(error);
      return data!.codigo_misioneros;
    },
    async regenerarCodigo(barrioId) {
      const { data, error } = await sb.rpc("regenerar_codigo", { p_barrio: barrioId });
      falla(error);
      return data as string;
    },
    async miembros(barrioId): Promise<Miembro[]> {
      const { data, error } = await sb.rpc("miembros_barrio", { p_barrio: barrioId });
      falla(error);
      return ((data ?? []) as Fila[]).map((m) => ({ userId: m.user_id, nombre: m.nombre, rol: m.rol }));
    },
    async cambiarRol(barrioId, userId, rol) {
      falla((await sb.rpc("cambiar_rol", { p_barrio: barrioId, p_user: userId, p_rol: rol })).error);
    },
  };
}
