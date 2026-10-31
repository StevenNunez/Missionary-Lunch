"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QrBarrio from "@/components/QrBarrio";
import { DIAS, claveDe, corto, hhmm, hoy, largo, sumarDias } from "@/lib/fechas";
import { obtenerRepo } from "@/lib/repo";
import { mensajeDe, wa } from "@/lib/util";
import type { Companerismo, DatosBarrio, Miembro, Rol, Tipo } from "@/lib/tipos";
import Calendario from "./Calendario";
import { Chat, Chevron } from "./iconos";
import { sinAlmuerzo, type VistaProps } from "./Vistas";

interface EncProps extends VistaProps {
  avisar: (msg: string) => void;
  recargarBarrio: () => void;
}

export function VistaEncargado(p: EncProps) {
  const { barrio } = p;
  const dias: string[] = [];
  for (let i = 0; i < 14; i++) {
    const k = claveDe(sumarDias(hoy(), i));
    if (!sinAlmuerzo(barrio, k)) dias.push(k);
  }
  const cupos = barrio.companerismos;
  const total = dias.length * cupos.length;
  const tomados = dias.reduce((n, k) => n + cupos.filter((c) => p.almuerzoDe(k, c.id)).length, 0);
  const confirmados = dias.reduce(
    (n, k) => n + cupos.filter((c) => { const a = p.almuerzoDe(k, c.id); return a?.miembroConfirmo && a.misionConfirmo; }).length,
    0,
  );
  const libres = dias.filter((k) => cupos.some((c) => !p.almuerzoDe(k, c.id)));
  const pedido =
    `Hermanos del ${barrio.nombre}: estos días los misioneros aún no tienen almuerzo:\n` +
    libres.map((k) => "• " + largo(k)).join("\n") +
    `\n\nAnótense en la app del barrio: ${typeof location !== "undefined" ? location.origin : ""}/b/${barrio.slug}\n¡Gracias!`;

  return (
    <>
      <div className="stats">
        <div className="stat"><b>{tomados}/{total}</b><span>cubiertos · 14 días</span></div>
        <div className="stat"><b>{confirmados}</b><span>confirmados</span></div>
        <div className="stat"><b>{total - tomados}</b><span>por cubrir</span></div>
      </div>
      <ListaDelDia {...p} />
      <Calendario {...p} />
      {libres.length > 0 && (
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <span className="h2">Faltan familias</span>
          <div className="row">{libres.map((k) => <span key={k} className="pill p-free">{corto(k)}</span>)}</div>
          <div className="row">
            <a className="btn" style={{ flex: 1 }} href={wa("", pedido)} target="_blank" rel="noopener noreferrer"><Chat /> Pedir en el grupo</a>
            <button className="btn sec" onClick={() => navigator.clipboard.writeText(pedido).then(() => p.avisar("Mensaje copiado"), () => p.avisar("No se pudo copiar"))}>Copiar</button>
          </div>
        </div>
      )}
      <details className="card">
        <summary><span>Compartir: enlace, QR y afiche</span><Chevron /></summary>
        <div style={{ marginTop: 14 }}><Compartir slug={barrio.slug} nombre={barrio.nombre} avisar={p.avisar} /></div>
      </details>
      <details className="card">
        <summary><span>Configuración del barrio</span><Chevron /></summary>
        <div style={{ marginTop: 14 }}><ConfigBarrio {...p} /></div>
      </details>
      <details className="card">
        <summary><span>Personas y roles</span><Chevron /></summary>
        <div style={{ marginTop: 14 }}><Personas barrioId={barrio.id} avisar={p.avisar} /></div>
      </details>
    </>
  );
}

/**
 * Lista de mañana para el encargado: quién falta por confirmar, con un botón de WhatsApp por familia.
 * Es el respaldo del recordatorio automático, y el único camino cuando la familia no tiene avisos activados.
 */
function ListaDelDia({ barrio, almuerzoDe }: EncProps) {
  const k = claveDe(sumarDias(hoy(), 1));
  if (sinAlmuerzo(barrio, k)) return null;
  const filas = barrio.companerismos.map((c) => ({ c, a: almuerzoDe(k, c.id) }));
  if (!filas.some((f) => f.a)) return null;
  const pendientes = filas.filter((f) => f.a && !f.a.miembroConfirmo).length;
  const plan =
    `Plan de almuerzos de mañana (${largo(k).toLowerCase()}) en ${barrio.nombre}:\n` +
    filas.map(({ c, a }) => `• ${c.nombre}: ${a ? `Familia ${a.familia}, ${hhmm(a.hora)}` : "sin almuerzo todavía"}`).join("\n");
  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div>
        <span className="h2">Mañana · {largo(k)}</span>
        <div className="muted" style={{ fontSize: 14 }}>
          {pendientes ? `${pendientes} familia(s) sin confirmar. Recuérdales con un toque.` : "Todas las familias confirmaron."}
        </div>
      </div>
      {filas.map(({ c, a }) => (
        <div key={c.id} style={{ display: "grid", gap: 8, borderTop: "1px solid var(--soft)", paddingTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
            <b>{a ? `Familia ${a.familia}` : "Sin familia"}</b>
            <span className="muted" style={{ fontSize: 14 }}>{c.nombre}{a ? ` · ${hhmm(a.hora)}` : ""}</span>
          </div>
          {a ? (
            <div className="row" style={{ alignItems: "center" }}>
              <span className={`pill ${a.miembroConfirmo ? "p-ok" : "p-free"}`}>{a.miembroConfirmo ? "Familia confirmó" : "Falta confirmar"}</span>
              {!a.miembroConfirmo && a.telefono && (
                <a className="btn sm" target="_blank" rel="noopener noreferrer"
                  href={wa(a.telefono, `Hola familia ${a.familia}, les escribe ${barrio.encargadoNombre || "el encargado de almuerzos"} del ${barrio.nombre}. Les recordamos el almuerzo de mañana (${largo(k).toLowerCase()}) a las ${hhmm(a.hora)} con los ${c.nombre}. ¿Nos confirman, por favor? ¡Muchas gracias!`)}>
                  <Chat /> Recordar
                </a>
              )}
            </div>
          ) : (
            <span className="muted" style={{ fontSize: 14 }}>Aún no hay familia para este día.</span>
          )}
        </div>
      ))}
      {barrio.telefonoMisioneros && (
        <a className="btn sec block" target="_blank" rel="noopener noreferrer" href={wa(barrio.telefonoMisioneros, plan)}>
          <Chat /> Enviar el plan a los misioneros
        </a>
      )}
    </div>
  );
}

function ConfigBarrio({ barrio, avisar, recargarBarrio }: EncProps) {
  const [d, setD] = useState<DatosBarrio>({ ...barrio });
  const [comps, setComps] = useState<Companerismo[]>(barrio.companerismos);
  const [ocupado, setOcupado] = useState(false);
  const set = <K extends keyof DatosBarrio>(k: K, v: DatosBarrio[K]) => setD((x) => ({ ...x, [k]: v }));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const limpios = comps.map((c) => ({ ...c, nombre: c.nombre.trim() })).filter((c) => c.nombre);
    if (!d.nombre.trim()) return avisar("Escribe el nombre del barrio");
    if (!limpios.length) return avisar("Agrega al menos un compañerismo");
    setOcupado(true);
    try {
      await obtenerRepo().guardarBarrio(barrio.id, {
        ...d, nombre: d.nombre.trim(), ventana: d.ventana.trim() || "13:00 – 15:00",
      }, limpios);
      recargarBarrio();
      avisar("Cambios guardados");
    } catch (err) {
      avisar(mensajeDe(err, "No se pudo guardar la configuración."));
    }
    setOcupado(false);
  }

  return (
    <form onSubmit={guardar} style={{ display: "grid", gap: 14 }}>
      <label>Nombre del barrio<input required value={d.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={80} /></label>
      <div className="grid2">
        <label>Encargado<input value={d.encargadoNombre} onChange={(e) => set("encargadoNombre", e.target.value)} placeholder="Hna. Pérez" /></label>
        <label>Su WhatsApp<input inputMode="tel" value={d.telefonoEncargado} onChange={(e) => set("telefonoEncargado", e.target.value)} placeholder="+56 9…" /></label>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>Compañerismos</span>
        {comps.map((c, i) => (
          <div className="comp-row" key={c.id || i}>
            <input aria-label="Nombre del compañerismo" value={c.nombre} maxLength={60}
              onChange={(e) => setComps(comps.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))} />
            <select aria-label="Tipo" value={c.tipo}
              onChange={(e) => setComps(comps.map((x, j) => (j === i ? { ...x, tipo: e.target.value as Tipo } : x)))}>
              <option value="elderes">Élderes</option>
              <option value="hermanas">Hermanas</option>
            </select>
            <button type="button" className="btn danger sm" aria-label="Quitar compañerismo"
              onClick={() => setComps(comps.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className="btn sec sm" onClick={() => setComps([...comps, { id: "", nombre: "", tipo: "elderes" }])}>+ Agregar compañerismo</button>
      </div>
      <div className="grid2">
        <label>Horario<input value={d.ventana} onChange={(e) => set("ventana", e.target.value)} /></label>
        <label>WhatsApp misioneros<input inputMode="tel" value={d.telefonoMisioneros} onChange={(e) => set("telefonoMisioneros", e.target.value)} placeholder="+56 9…" /></label>
      </div>
      <label>Dirección de los misioneros <span className="hint">Para cuando la familia lleva la comida</span>
        <input value={d.direccionPension} onChange={(e) => set("direccionPension", e.target.value)} />
      </label>
      <label>Alergias o restricciones<input value={d.alergias} onChange={(e) => set("alergias", e.target.value)} /></label>
      <div style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>Días sin almuerzo con miembros</span>
        <div className="days7">
          {DIAS.map((nombre, i) => (
            <label key={i}>
              <input type="checkbox" checked={d.diasSinAlmuerzo.includes(i)}
                onChange={(e) => set("diasSinAlmuerzo", e.target.checked ? [...d.diasSinAlmuerzo, i] : d.diasSinAlmuerzo.filter((x) => x !== i))} />
              {nombre.slice(0, 3)}
            </label>
          ))}
        </div>
      </div>
      <label>Guías del presidente de misión
        <textarea rows={2} value={d.guiasPresidente} onChange={(e) => set("guiasPresidente", e.target.value)} />
      </label>
      <button className="btn block" type="submit" disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar cambios"}</button>
    </form>
  );
}

const ROLES: { v: Rol; t: string }[] = [
  { v: "miembro", t: "Miembro" },
  { v: "misionero", t: "Misionero" },
  { v: "encargado", t: "Encargado" },
];

/** Enlace, QR y afiche para que las familias lleguen al calendario del barrio. */
function Compartir({ slug, nombre, avisar }: { slug: string; nombre: string; avisar: (m: string) => void }) {
  const [enlace, setEnlace] = useState("");
  useEffect(() => { setEnlace(`${location.origin}/b/${slug}`); }, [slug]);
  const local = /localhost|127\.0\.0\.1/.test(enlace);

  return (
    <div style={{ display: "grid", gap: 14, justifyItems: "center", textAlign: "center" }}>
      <p className="muted" style={{ margin: 0 }}>
        Comparte el enlace en el grupo de WhatsApp o imprime el afiche con el QR para el tablero de la capilla. Quien entra queda como miembro.
      </p>
      {enlace && <QrBarrio texto={enlace} etiqueta={`Código QR del calendario de ${nombre}`} tam={200} />}
      <code style={{ wordBreak: "break-all", fontWeight: 700 }}>{enlace.replace(/^https?:\/\//, "")}</code>
      {local && <span className="error">Este enlace es de tu computador (localhost): el QR real saldrá desde el sitio publicado.</span>}
      <div className="row" style={{ justifyContent: "center" }}>
        <button type="button" className="btn sec sm" onClick={() => navigator.clipboard.writeText(enlace).then(() => avisar("Enlace copiado"), () => avisar("No se pudo copiar"))}>Copiar enlace</button>
        <a className="btn sec sm" target="_blank" rel="noopener noreferrer" href={wa("", `Anótense para dar almuerzo a los misioneros: ${enlace}`)}><Chat /> WhatsApp</a>
        <Link className="btn sm" href={`/b/${slug}/afiche`}>Afiche para imprimir</Link>
      </div>
    </div>
  );
}

function Personas({ barrioId, avisar }: { barrioId: string; avisar: (m: string) => void }) {
  const [lista, setLista] = useState<Miembro[]>([]);
  const [codigo, setCodigo] = useState("");
  const repo = obtenerRepo();

  async function cargar() {
    try {
      const [m, c] = await Promise.all([repo.miembros(barrioId), repo.codigoMisioneros(barrioId)]);
      setLista(m);
      setCodigo(c);
    } catch (e) {
      avisar(mensajeDe(e, "No se pudo leer la lista."));
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(); }, [barrioId]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="hint-box">
        <b>Código de los misioneros:</b> pásalo solo a los misioneros; al ingresarlo en el enlace del barrio quedan con el rol de misionero.
        <div className="code-box" style={{ margin: "8px 0" }}>{codigo || "…"}</div>
        <button type="button" className="link-btn"
          onClick={async () => { try { setCodigo(await repo.regenerarCodigo(barrioId)); avisar("Código nuevo generado"); } catch (e) { avisar(mensajeDe(e, "No se pudo generar.")); } }}>
          Generar uno nuevo
        </button>
      </div>
      <div>
        {lista.map((m) => (
          <div className="member-row" key={m.userId}>
            <span>{m.nombre}</span>
            <select aria-label={`Rol de ${m.nombre}`} value={m.rol}
              onChange={async (e) => {
                try { await repo.cambiarRol(barrioId, m.userId, e.target.value as Rol); await cargar(); }
                catch (err) { avisar(mensajeDe(err, "No se pudo cambiar el rol.")); }
              }}>
              {ROLES.map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
