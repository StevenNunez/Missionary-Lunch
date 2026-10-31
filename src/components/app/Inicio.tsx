"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Creditos from "@/components/Creditos";
import { AjusteAvisos, TarjetaAvisos, TarjetaInstalar } from "@/components/Instalar";
import { Marca } from "@/components/Marca";
import { obtenerRepo } from "@/lib/repo";
import { extraerUnidad } from "@/lib/unidad";
import { guardar, leer, mensajeDe } from "@/lib/util";
import type { MiBarrio, Sesion } from "@/lib/tipos";
import BuscarBarrio from "./BuscarBarrio";
import Login from "./Login";

const ETIQUETA = { encargado: "Encargado", misionero: "Misionero", miembro: "Miembro" } as const;

type Hallado = { nombre: string; direccion: string };

/** Cómo funciona, en tres pasos: lo primero que ve quien llega por el enlace del grupo. */
function Pasos() {
  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <span className="h2">Así de simple</span>
      <ol className="pasos">
        <li>Busca tu barrio, o abre el enlace que compartió el encargado.</li>
        <li>Entra con tu nombre y tu número de WhatsApp.</li>
        <li>Toca un día libre y elige cómo darás el almuerzo.</li>
      </ol>
    </div>
  );
}

export default function Inicio() {
  const repo = useMemo(() => obtenerRepo(), []);
  const router = useRouter();
  const [listo, setListo] = useState(false);
  const [conocido, setConocido] = useState(false); // ya entró antes: se reserva el lugar de «Tus barrios»
  useEffect(() => setConocido(Boolean(leer("am_conocido"))), []);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [barrios, setBarrios] = useState<MiBarrio[]>([]);
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [enlace, setEnlace] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [hallado, setHallado] = useState<Hallado | "buscando" | "no" | null>(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const unidad = extraerUnidad(enlace);

  const cargar = useCallback(async () => {
    const s = await repo.sesion();
    setSesion(s);
    if (s?.nombre) {
      const b = await repo.misBarrios();
      setBarrios(b);
      guardar("am_conocido", b.length ? "1" : "");
    } else {
      guardar("am_conocido", "");
    }
    setListo(true);
  }, [repo]);
  useEffect(() => { cargar().catch(() => setListo(true)); }, [cargar]);

  // Al pegar el enlace o el número de la Iglesia, se trae el nombre y la dirección de la capilla
  useEffect(() => {
    if (!unidad) { setHallado(null); return; }
    let vigente = true;
    setHallado("buscando");
    fetch(`/api/unidad?n=${unidad}`)
      .then((r) => (r.ok ? (r.json() as Promise<Hallado>) : Promise.reject()))
      .then((h) => { if (vigente) { setHallado(h); setNuevo(h.nombre); } })
      .catch(() => { if (vigente) setHallado("no"); });
    return () => { vigente = false; };
  }, [unidad]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!unidad) return;
    setOcupado(true);
    setError("");
    try {
      const direccion = typeof hallado === "object" && hallado ? hallado.direccion : "";
      const slug = await repo.crearBarrio({ nombre: nuevo, unidad, direccion });
      // Aviso a Teo Labs para que lo apruebe; si falla, el barrio igual queda creado.
      if (repo.modo === "supabase") {
        fetch("/api/barrio-nuevo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) }).catch(() => {});
      }
      router.push(`/b/${slug}`);
    } catch (err) {
      setError(mensajeDe(err, "No se pudo crear el barrio."));
      setOcupado(false);
    }
  }

  let cuerpo;
  if (!listo) {
    // El buscador no depende de la sesión: se ve de inmediato. Solo lo personal espera.
    cuerpo = (
      <>
        {conocido && <div className="esqueleto" aria-hidden="true" />}
        <BuscarBarrio titulo="Busca tu barrio" />
        <Pasos />
      </>
    );
  } else {
    let crear_;
    if (!creando) {
      crear_ = (
        <button className="link-btn" style={{ justifySelf: "center" }} onClick={() => setCreando(true)}>
          Soy el encargado de almuerzos: crear el calendario de mi barrio
        </button>
      );
    } else if (!sesion) {
      crear_ = (
        <>
          <p className="muted" style={{ margin: 0 }}>Para crear el calendario primero entra con tu cuenta.</p>
          <Login alEntrar={cargar} />
        </>
      );
    } else if (!sesion.nombre) {
      crear_ = (
        <form className="card" style={{ display: "grid", gap: 14 }}
          onSubmit={async (e) => { e.preventDefault(); await repo.guardarNombre(nombre); cargar(); }}>
          <label>¿Cómo te llamas?
            <span className="hint">Así te verá el encargado del barrio.</span>
            <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Hna. Daniela Fuentes" maxLength={80} autoComplete="name" />
          </label>
          <button className="btn block" type="submit" disabled={!nombre.trim()}>Continuar</button>
        </form>
      );
    } else {
      crear_ = (
        <form className="card" style={{ display: "grid", gap: 12 }} onSubmit={crear}>
          <span className="h2">Crear el calendario de tu barrio</span>
          <p className="muted" style={{ margin: 0 }}>
            Solo si el líder del barrio te asignó como encargado de almuerzos. Si solo quieres anotarte, busca tu barrio arriba.
          </p>
          <label>Enlace o número de unidad de tu barrio
            <span className="hint">
              En local.churchofjesuschrist.org abre tu barrio, toca <b>Compartir</b> y pega el enlace aquí (o escribe el número).
            </span>
            <input required value={enlace} onChange={(e) => setEnlace(e.target.value)} inputMode="url" autoComplete="off"
              placeholder="https://local.churchofjesuschrist.org/u/220108" />
          </label>
          {enlace.trim() && !unidad && (
            <span className="error" role="alert">No encuentro el número. Usa el enlace de «Compartir» (lleva /u/ y un número) o escribe solo el número.</span>
          )}
          {hallado === "buscando" && <span className="muted">Buscando tu barrio…</span>}
          {typeof hallado === "object" && hallado && (
            <div className="card" style={{ display: "grid", gap: 2 }} role="status">
              <b>{hallado.nombre}</b>
              {hallado.direccion && <span className="muted">{hallado.direccion}</span>}
              <span className="muted" style={{ fontSize: 14 }}>Unidad {unidad} · ¿Es tu barrio?</span>
            </div>
          )}
          {hallado === "no" && (
            <span className="muted">No pude leer la página de la Iglesia. Escribe el nombre del barrio a mano.</span>
          )}
          <label>Nombre del barrio<input required value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Barrio Las Compañías" maxLength={80} /></label>
          {error && <span className="error" role="alert">{error}</span>}
          <button className="btn block" type="submit" disabled={ocupado || !unidad || nuevo.trim().length < 2}>Crear barrio</button>
        </form>
      );
    }

    cuerpo = (
      <>
        {barrios.length > 0 && (
          <>
            <div className="label">Tus barrios</div>
            <div className="barrio-list">
              {barrios.map((b) => (
                <Link key={b.slug} href={`/b/${b.slug}`} className="card barrio-item">
                  <b>{b.nombre}</b><span className="pill p-ok">{ETIQUETA[b.rol]}</span>
                </Link>
              ))}
            </div>
          </>
        )}
        <BuscarBarrio titulo={barrios.length ? "Buscar otro barrio" : "Busca tu barrio"} />
        {barrios.length === 0 && !sesion?.nombre && <Pasos />}
        {barrios.length > 0 && (
          <p className="muted" style={{ margin: 0, textAlign: "center" }}>
            ¿Te cambiaste de sector? Busca tu barrio nuevo arriba; los misioneros entran con el código de misioneros de ese barrio.
          </p>
        )}
        {crear_}
        {sesion && repo.modo === "supabase" && (
          <button className="link-btn" style={{ justifySelf: "center" }}
            onClick={async () => { await repo.cerrarSesion(); setSesion(null); setBarrios([]); setCreando(false); }}>Cerrar sesión</button>
        )}
      </>
    );
  }

  return (
    <>
      <div className="band"><div className="wrap">
        <div className="band-top"><Marca /></div>
        <h1>{sesion?.nombre ? `Hola, ${sesion.nombre.split(" ")[0]}` : "Almuerzo para los misioneros"}</h1>
        <p className="sub">Anótate en el calendario de tu barrio en menos de un minuto.</p>
      </div></div>
      <main><div className="wrap stack" style={{ paddingBottom: 32 }}>
        {repo.modo === "local" && (
          <div className="demo-bar"><span>Modo demo: los datos quedan solo en este navegador.</span></div>
        )}
        <div className="entra" style={{ display: "contents" }}>
        <TarjetaInstalar />
        {sesion?.nombre && <TarjetaAvisos activo={repo.modo === "supabase"} />}
        {cuerpo}
        {sesion?.nombre && <AjusteAvisos activo={repo.modo === "supabase"} />}
        </div>
        <Creditos />
      </div></main>
    </>
  );
}
