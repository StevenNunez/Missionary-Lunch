"use client";

import { claveDe, corto, DIAS, hhmm, hoy, largo, leerClave, relativo, sumarDias } from "@/lib/fechas";
import { wa } from "@/lib/util";
import type { Almuerzo, Barrio } from "@/lib/tipos";
import Calendario from "./Calendario";
import { Chat, Chevron } from "./iconos";
import { MODOS, Pildora, Datos } from "./Hojas";

export interface VistaProps {
  barrio: Barrio;
  almuerzos: Almuerzo[];
  yo: string;
  mes: Date;
  cambiarMes: (d: Date) => void;
  almuerzoDe: (fecha: string, compId: string) => Almuerzo | undefined;
  abrir: (fecha: string) => void;
  confirmarMision: (a: Almuerzo) => void;
}

export const sinAlmuerzo = (b: Barrio, k: string) => b.diasSinAlmuerzo.includes(leerClave(k).getDay());

export function Ficha({ fecha, clase }: { fecha: string; clase?: string }) {
  const d = leerClave(fecha);
  return (
    <div className={`date-tile ${clase || ""}`}>
      <b>{d.getDate()}</b>
      <span>{DIAS[d.getDay()].slice(0, 3)}</span>
    </div>
  );
}

const confirmado = (a: Almuerzo) => a.miembroConfirmo && a.misionConfirmo;

function Normas({ barrio }: { barrio: Barrio }) {
  return (
    <details className="card">
      <summary><span>Normas para las comidas</span><Chevron /></summary>
      <p className="muted" style={{ margin: "10px 0 0" }}>
        Normas misionales para discípulos de Jesucristo (2.4.5 y 2.4.2): los misioneros comparten un mensaje de 15 a 20
        minutos antes o después de comer; si comen con alguien del sexo opuesto debe estar presente otro adulto de su
        mismo sexo; almuerzo y cena no suman más de dos horas.
        {barrio.guiasPresidente && <><br /><br /><b>Guía del presidente de misión:</b> {barrio.guiasPresidente}</>}
      </p>
    </details>
  );
}

export function VistaMiembro(p: VistaProps) {
  const tk = claveDe(hoy());
  const mios = p.almuerzos
    .filter((a) => a.creadoPor === p.yo && a.fecha >= tk)
    .sort((x, y) => (x.fecha < y.fecha ? -1 : 1));
  return (
    <>
      <Calendario {...p} />
      {mios.length ? (
        <>
          <div className="label">Tus próximos almuerzos</div>
          <div className="list">
            {mios.map((a) => {
              const c = p.barrio.companerismos.find((x) => x.id === a.companerismoId);
              return (
                <button key={a.id} className="card next" onClick={() => p.abrir(a.fecha)}
                  style={{ border: 0, textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer" }}>
                  <Ficha fecha={a.fecha} clase={confirmado(a) ? "teal" : ""} />
                  <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                    <b>{relativo(a.fecha) || corto(a.fecha)} · {c?.nombre ?? "Misioneros"}</b>
                    <span className="muted">{hhmm(a.hora)} · {MODOS[a.modo].t}</span>
                    <Pildora a={a} />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="hint-box">
          <b>¿Cómo funciona?</b> Toca un día con círculo verde, elige cómo darás el almuerzo y listo. El día anterior te
          pediremos confirmar, porque los misioneros planifican cada noche.
        </div>
      )}
      <Normas barrio={p.barrio} />
    </>
  );
}

export function VistaMision(p: VistaProps) {
  const { barrio } = p;
  const t = claveDe(hoy());
  const m = claveDe(sumarDias(hoy(), 1));
  return (
    <>
      {([[t, "Hoy"], [m, "Mañana"]] as const).map(([k, etiqueta]) => (
        <div key={k} style={{ display: "contents" }}>
          <div className="label">{etiqueta} · {largo(k)}</div>
          {sinAlmuerzo(barrio, k) ? (
            <div className="card next"><Ficha fecha={k} clase="gray" /><span className="muted">Sin almuerzo con miembros este día.</span></div>
          ) : (
            barrio.companerismos.map((c) => {
              const a = p.almuerzoDe(k, c.id);
              if (!a) {
                return (
                  <div className="card" style={{ display: "grid", gap: 12 }} key={c.id}>
                    <div className="next">
                      <Ficha fecha={k} clase="gray" />
                      <div><b>{c.nombre}</b><br /><span className="pill p-off">Sin almuerzo</span></div>
                    </div>
                    {barrio.telefonoEncargado && (
                      <a className="btn sec block" target="_blank" rel="noopener noreferrer"
                        href={wa(barrio.telefonoEncargado, `Hola ${barrio.encargadoNombre}, somos los ${c.nombre}. ${etiqueta} (${largo(k).toLowerCase()}) aún no tenemos almuerzo. ¿Nos ayuda a buscar una familia?`)}>
                        <Chat /> Avisar al encargado
                      </a>
                    )}
                  </div>
                );
              }
              const msg = `Hola familia ${a.familia}, somos los ${c.nombre}. Confirmamos el almuerzo de ${etiqueta.toLowerCase()} a las ${hhmm(a.hora)}. ¡Muchas gracias! Llevaremos un mensaje corto para compartir.`;
              return (
                <div className="card" style={{ display: "grid", gap: 12 }} key={c.id}>
                  <div className="next">
                    <Ficha fecha={k} clase={confirmado(a) ? "teal" : ""} />
                    <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                      <b>Familia {a.familia}</b><span className="muted">{c.nombre}</span><Pildora a={a} />
                    </div>
                  </div>
                  <Datos a={a} completo yo={p.yo} />
                  <div className="row">
                    {!a.misionConfirmo && <button className="btn teal" style={{ flex: 1 }} onClick={() => p.confirmarMision(a)}>Confirmamos</button>}
                    <a className="btn sec" style={{ flex: 1 }} href={wa(a.telefono, msg)} target="_blank" rel="noopener noreferrer"><Chat /> Escribir</a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ))}
      <div className="label">Calendario del barrio</div>
      <Calendario {...p} />
    </>
  );
}
