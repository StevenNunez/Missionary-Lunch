"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Creditos from "@/components/Creditos";
import { AjusteAvisos, TarjetaAvisos, TarjetaInstalar } from "@/components/Instalar";
import { claveDe, hoy, sumarDias } from "@/lib/fechas";
import { obtenerRepo } from "@/lib/repo";
import { cambiarRolDemo, reiniciarDemo } from "@/lib/repo/local";
import { Marca } from "@/components/Marca";
import { guardar, leer, mensajeDe } from "@/lib/util";
import { CupoTomado, type Almuerzo, type BarrioCtx, type BarrioPublico, type Reserva, type Rol, type Sesion } from "@/lib/tipos";
import { VistaEncargado } from "./Encargado";
import { HojaDia, HojaLiberar, HojaReserva, type Vista } from "./Hojas";
import { TabCalendario, TabEncargado, TabMisioneros } from "./iconos";
import Login from "./Login";
import { VistaMision, VistaMiembro } from "./Vistas";

type Fase = "cargando" | "login" | "nombre" | "unirse" | "noexiste" | "listo";
type HojaAbierta =
  | { t: "dia"; fecha: string }
  | { t: "reserva"; fecha: string; compId: string }
  | { t: "liberar"; a: Almuerzo };

const TABS: Record<Rol, Vista[]> = {
  miembro: ["miembro"],
  misionero: ["miembro", "mision"],
  encargado: ["miembro", "mision", "enc"],
};
const SUBTITULO: Record<Vista, string> = {
  miembro: "¿Qué día puedes dar almuerzo a los misioneros?",
  mision: "Plan del día: confirmen su almuerzo",
  enc: "Coordinación de almuerzos del barrio",
};

export default function BarrioApp({ slug }: { slug: string }) {
  const repo = useMemo(() => obtenerRepo(), []);
  const [fase, setFase] = useState<Fase>("cargando");
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [ctx, setCtx] = useState<BarrioCtx | null>(null);
  const [publico, setPublico] = useState<BarrioPublico | null>(null);
  const [almuerzos, setAlmuerzos] = useState<Almuerzo[]>([]);
  const [vista, setVista] = useState<Vista>("miembro");
  const [mes, setMes] = useState(() => new Date(hoy().getFullYear(), hoy().getMonth(), 1));
  const [hoja, setHoja] = useState<HojaAbierta | null>(null);
  const [aviso, setAviso] = useState("");
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  const avisar = useCallback((msg: string) => {
    setAviso(msg);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(""), 2800);
  }, []);

  const cargar = useCallback(async () => {
    try {
      // Modo demo: enlaces como ?rol=misionero&tab=mision para mostrar cada vista
      if (repo.modo === "local") {
        const q = new URLSearchParams(location.search);
        const r = q.get("rol");
        if (r === "miembro" || r === "misionero" || r === "encargado") cambiarRolDemo(slug, r);
        const t = q.get("tab");
        if (t === "miembro" || t === "mision" || t === "enc") guardar("am_tab", t);
      }
      // Lo público del barrio se muestra antes del login: así se ve a qué barrio se está entrando
      const p = await repo.barrioPublico(slug);
      if (!p) return setFase("noexiste");
      setPublico(p);
      const s = await repo.sesion();
      setSesion(s);
      if (!s) return setFase("login");
      if (!s.nombre) return setFase("nombre");
      const c = await repo.cargarBarrio(slug);
      if (c) {
        setCtx(c);
        return setFase("listo");
      }
      setFase("unirse");
    } catch (e) {
      avisar(mensajeDe(e, "No se pudo cargar el barrio. Recarga la página."));
    }
  }, [repo, slug, avisar]);

  useEffect(() => { cargar(); }, [cargar]);

  // El tab recordado solo vale si el rol lo permite
  useEffect(() => {
    if (!ctx) return;
    const guardado = leer("am_tab") as Vista | null;
    setVista(guardado && TABS[ctx.rol].includes(guardado) ? guardado : "miembro");
  }, [ctx?.rol]); // eslint-disable-line react-hooks/exhaustive-deps

  const barrioId = ctx?.barrio.id;
  const rol = ctx?.rol;
  const traer = useCallback(async () => {
    if (!ctx) return;
    try {
      setAlmuerzos(await repo.almuerzos(ctx.barrio, ctx.rol, claveDe(sumarDias(hoy(), -1))));
    } catch {
      avisar("No se pudo leer el calendario.");
    }
  }, [repo, ctx, avisar]);

  useEffect(() => {
    if (!barrioId) return;
    traer();
    return repo.suscribir(barrioId, traer);
  }, [barrioId, rol, repo, traer]);

  const porClave = useMemo(() => {
    const m = new Map<string, Almuerzo>();
    almuerzos.forEach((a) => m.set(`${a.fecha}|${a.companerismoId}`, a));
    return m;
  }, [almuerzos]);
  const almuerzoDe = useCallback((f: string, c: string) => porClave.get(`${f}|${c}`), [porClave]);

  async function accion(fn: () => Promise<void>, ok: string) {
    try {
      await fn();
      setHoja(null);
      avisar(ok);
      traer();
      return true;
    } catch (e) {
      if (e instanceof CupoTomado) setHoja(null);
      avisar(mensajeDe(e, "No se pudo guardar. Revisa tu conexión."));
      traer();
      return false;
    }
  }

  // ---------- pantallas previas al calendario ----------
  const marco = (titulo: string, sub: string, cuerpo: React.ReactNode) => (
    <>
      <div className="band"><div className="wrap">
        <div className="band-top"><Marca /><Link className="band-link" href="/">Inicio</Link></div>
        <h1>{titulo}</h1>
        <p className="sub">{sub}</p>
      </div></div>
      <main><div className="wrap" style={{ paddingBottom: 32 }}>{cuerpo}<Creditos /></div></main>
    </>
  );

  if (fase === "cargando") return marco("Cargando…", "", <div className="card empty">Cargando el calendario del barrio…</div>);
  const identidad = [publico?.direccion, publico?.unidad && `Unidad ${publico.unidad}`].filter(Boolean).join(" · ");
  if (fase === "login") {
    return marco(publico?.nombre ?? "Ingresa", `${identidad ? identidad + ". " : ""}Para anotarte, entra con tu nombre y tu número de WhatsApp.`, (
      <>
        <Login alEntrar={cargar} />
        <p className="muted" style={{ textAlign: "center" }}>¿No es tu barrio? <Link href="/">Buscar otro</Link></p>
      </>
    ));
  }
  if (fase === "nombre") return <PedirNombre onListo={async (n) => { await repo.guardarNombre(n); cargar(); }} marco={marco} />;
  if (fase === "noexiste") {
    return marco("Barrio no encontrado", "", (
      <div className="card empty"><span className="h2">Este enlace no corresponde a ningún barrio</span>
        <Link className="btn" href="/">Ir al inicio</Link></div>
    ));
  }
  if (fase === "unirse") {
    return marco(publico?.nombre ?? "", `${identidad ? identidad + ". " : ""}Anótate para dar almuerzo a los misioneros.`, (
      <>
        <Unirse onUnirse={async (codigo) => {
          try { await repo.unirse(slug, codigo); await cargar(); } catch (e) { avisar(mensajeDe(e, "No se pudo entrar al barrio.")); }
        }} aviso={aviso} />
        <p className="muted" style={{ textAlign: "center" }}>¿No es tu barrio? <Link href="/">Buscar otro</Link></p>
      </>
    ));
  }
  if (!ctx || !sesion) return null;

  // ---------- app ----------
  const { barrio } = ctx;
  const tabs = TABS[ctx.rol];
  const h = new Date().getHours();
  const saludo = h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
  const comun = {
    barrio, almuerzos, yo: sesion.userId, mes, cambiarMes: setMes, almuerzoDe,
    abrir: (fecha: string) => setHoja({ t: "dia", fecha }),
    confirmarMision: (a: Almuerzo) => { accion(() => repo.confirmarMision(a.id), "Confirmado en el plan del día"); },
  };

  return (
    <>
      <div className="band"><div className="wrap">
        <div className="band-top">
          <Marca prefijo={saludo} />
          <span className="right">
            <Link className="band-link" href="/">Mis barrios</Link>
            {repo.modo === "supabase" && (
              <button className="band-link" onClick={async () => { await repo.cerrarSesion(); location.href = "/"; }}>Salir</button>
            )}
          </span>
        </div>
        <h1>{barrio.nombre}</h1>
        <p className="sub">{SUBTITULO[vista]}{barrio.ventana ? ` · ${barrio.ventana}` : ""}</p>
      </div></div>
      <main><div className="wrap stack" style={{ paddingBottom: tabs.length > 1 ? undefined : 32 }}>
        {repo.modo === "local" && <BarraDemo slug={slug} rol={ctx.rol} recargar={cargar} />}
        {barrio.estado === "pendiente" && (
          <div className="hint-box" role="status">
            <b>Tu barrio está pendiente de aprobación.</b> Mientras tanto puedes configurarlo, pero el enlace y el QR
            todavía no sirven para otras familias. Te avisaremos cuando quede habilitado.
          </div>
        )}
        <TarjetaInstalar />
        <TarjetaAvisos activo={repo.modo === "supabase"} />
        {vista === "miembro" && <VistaMiembro {...comun} />}
        {vista === "mision" && <VistaMision {...comun} />}
        {vista === "enc" && <VistaEncargado {...comun} avisar={avisar} recargarBarrio={cargar} />}
        <AjusteAvisos activo={repo.modo === "supabase"} />
        <DejarBarrio nombre={barrio.nombre} salir={async () => {
          try { await repo.salirDeBarrio(barrio.id); location.href = "/"; } catch (e) { avisar(mensajeDe(e, "No se pudo salir del barrio.")); }
        }} />
        <Creditos />
      </div></main>

      <nav className={`tabbar${tabs.length > 1 ? "" : " hidden"}`} aria-label="Secciones">
        <div className="in" role="tablist" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map((t) => (
            <button key={t} role="tab" aria-selected={vista === t}
              onClick={() => { setVista(t); guardar("am_tab", t); setHoja(null); window.scrollTo({ top: 0 }); }}>
              {t === "miembro" ? <TabCalendario /> : t === "mision" ? <TabMisioneros /> : <TabEncargado />}
              {t === "miembro" ? "Calendario" : t === "mision" ? "Misioneros" : "Encargado"}
            </button>
          ))}
        </div>
      </nav>

      {hoja?.t === "dia" && (
        <HojaDia
          fecha={hoja.fecha} vista={vista} barrio={barrio} yo={sesion.userId} almuerzoDe={almuerzoDe}
          cerrar={() => setHoja(null)}
          reservar={(fecha, compId) => setHoja({ t: "reserva", fecha, compId })}
          confirmarMiembro={(a) => { accion(() => repo.confirmarMiembro(a.id), "Almuerzo confirmado"); }}
          confirmarMision={comun.confirmarMision}
          liberar={(a) => setHoja({ t: "liberar", a })}
        />
      )}
      {hoja?.t === "reserva" && (
        <HojaReserva
          fecha={hoja.fecha} compId={hoja.compId} barrio={barrio} cerrar={() => setHoja(null)}
          enviar={(r: Reserva) => accion(() => repo.reservar(r), "¡Gracias! Quedó reservado")}
        />
      )}
      {hoja?.t === "liberar" && (
        <HojaLiberar a={hoja.a} rol={ctx.rol} cerrar={() => setHoja(null)}
          confirmar={() => { accion(() => repo.liberar(hoja.a.id), "Día liberado"); }} />
      )}
      {aviso && <div className="toast" role="status">{aviso}</div>}
    </>
  );
}

function PedirNombre({ onListo, marco }: { onListo: (n: string) => Promise<void>; marco: (t: string, s: string, c: React.ReactNode) => React.ReactNode }) {
  const [nombre, setNombre] = useState("");
  const [ocupado, setOcupado] = useState(false);
  return marco("Bienvenido", "Una última cosa antes de empezar.", (
    <form className="card" style={{ display: "grid", gap: 14 }}
      onSubmit={async (e) => { e.preventDefault(); setOcupado(true); await onListo(nombre); setOcupado(false); }}>
      <label>¿Cómo te llamas?
        <span className="hint">Así te verá el encargado del barrio.</span>
        <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Hna. Daniela Fuentes" maxLength={80} autoComplete="name" />
      </label>
      <button className="btn block" type="submit" disabled={ocupado || !nombre.trim()}>Continuar</button>
    </form>
  ));
}

/** Para quien se cambia de sector: deja este barrio y busca el nuevo desde el inicio. */
function DejarBarrio({ nombre, salir }: { nombre: string; salir: () => Promise<void> }) {
  const [seguro, setSeguro] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  if (!seguro) {
    return <button className="link-btn" style={{ justifySelf: "center" }} onClick={() => setSeguro(true)}>Me cambié de barrio: dejar este barrio</button>;
  }
  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <span className="h2">¿Dejar {nombre}?</span>
      <p className="muted" style={{ margin: 0 }}>
        Dejarás de ver este calendario. Lo ya anotado se queda en el barrio. Para entrar al barrio nuevo, búscalo desde el inicio
        (los misioneros usan el código de misioneros del barrio nuevo).
      </p>
      <div className="row">
        <button className="btn danger" disabled={ocupado} onClick={async () => { setOcupado(true); await salir(); setOcupado(false); }}>Sí, dejar el barrio</button>
        <button className="btn sec" onClick={() => setSeguro(false)}>Cancelar</button>
      </div>
    </div>
  );
}

function Unirse({ onUnirse, aviso }: { onUnirse: (codigo?: string) => Promise<void>; aviso: string }) {
  const [soyMisionero, setSoyMisionero] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  return (
    <form className="card" style={{ display: "grid", gap: 14 }}
      onSubmit={async (e) => { e.preventDefault(); setOcupado(true); await onUnirse(soyMisionero ? codigo : undefined); setOcupado(false); }}>
      <span className="h2">Entrar al barrio</span>
      <label className="days7" style={{ display: "flex" }}>
        <input type="checkbox" checked={soyMisionero} onChange={(e) => setSoyMisionero(e.target.checked)} /> Soy misionero
      </label>
      {soyMisionero && (
        <label>Código de los misioneros
          <input className="code-input" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={12} required />
        </label>
      )}
      {aviso && <span className="error" role="alert">{aviso}</span>}
      <button className="btn block" type="submit" disabled={ocupado}>Entrar</button>
    </form>
  );
}

function BarraDemo({ slug, rol, recargar }: { slug: string; rol: Rol; recargar: () => void }) {
  return (
    <div className="demo-bar">
      <span>Modo demo: los datos quedan solo en este navegador.</span>
      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600 }}>
          Ver como
          <select value={rol} onChange={(e) => { cambiarRolDemo(slug, e.target.value as Rol); recargar(); }}>
            <option value="miembro">Miembro</option>
            <option value="misionero">Misionero</option>
            <option value="encargado">Encargado</option>
          </select>
        </label>
        <button className="link-btn" onClick={() => { reiniciarDemo(); recargar(); }}>Reiniciar</button>
      </span>
    </div>
  );
}
