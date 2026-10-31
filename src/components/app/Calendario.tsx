"use client";

import { HORIZONTE, MESES, claveDe, hoy, largo, sumarDias } from "@/lib/fechas";
import type { Almuerzo, Barrio } from "@/lib/tipos";
import { Derecha, Izquierda } from "./iconos";

type Estado = "free" | "held" | "ok";
const estadoDe = (a?: Almuerzo): Estado => (!a ? "free" : a.miembroConfirmo && a.misionConfirmo ? "ok" : "held");

interface Props {
  barrio: Barrio;
  mes: Date;
  cambiarMes: (d: Date) => void;
  almuerzoDe: (fecha: string, compId: string) => Almuerzo | undefined;
  yo: string;
  abrir: (fecha: string) => void;
}

export default function Calendario({ barrio, mes, cambiarMes, almuerzoDe, yo, abrir }: Props) {
  const dim = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const lead = (new Date(mes.getFullYear(), mes.getMonth(), 1).getDay() + 6) % 7;
  const t = hoy();
  const tk = claveDe(t);
  const maxD = sumarDias(t, HORIZONTE);
  const maxK = claveDe(maxD);
  const minM = new Date(t.getFullYear(), t.getMonth(), 1);
  const maxM = new Date(maxD.getFullYear(), maxD.getMonth(), 1);
  const comps = barrio.companerismos;

  const celdas = [];
  for (let i = 0; i < lead; i++) celdas.push(<span key={`v${i}`} />);
  for (let d = 1; d <= dim; d++) {
    const fecha = new Date(mes.getFullYear(), mes.getMonth(), d);
    const k = claveDe(fecha);
    const fuera = k < tk || k > maxK;
    const sinAlmuerzo = !fuera && barrio.diasSinAlmuerzo.includes(fecha.getDay());
    let cls = "past";
    let etiqueta = "no disponible";
    let mio = false;
    if (!fuera && sinAlmuerzo) {
      cls = "off";
      etiqueta = "sin almuerzo";
    } else if (!fuera) {
      const as = comps.map((c) => almuerzoDe(k, c.id));
      const s = as.map(estadoDe);
      const libres = s.filter((x) => x === "free").length;
      mio = as.some((a) => a && a.creadoPor === yo);
      const todosOk = s.every((x) => x === "ok");
      cls = libres === s.length ? "free" : libres > 0 ? "partial" : todosOk ? "ok" : "held";
      etiqueta = libres === s.length ? "disponible" : libres > 0 ? "un cupo disponible" : todosOk ? "confirmado" : "reservado";
    }
    celdas.push(
      <button
        key={k}
        className={`day ${cls}${k === tk ? " today" : ""}`}
        disabled={fuera || sinAlmuerzo}
        onClick={() => abrir(k)}
        aria-label={`${largo(k)}: ${etiqueta}${mio ? ", tu almuerzo" : ""}`}
      >
        {d}
        {mio && <i className="mine" />}
      </button>,
    );
  }

  return (
    <section className="card" aria-label="Calendario">
      <div className="cal-head">
        <span className="h2">{MESES[mes.getMonth()]} {mes.getFullYear()}</span>
        <div className="nav">
          <button className="icon-btn" aria-label="Mes anterior" disabled={mes <= minM}
            onClick={() => cambiarMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}><Izquierda /></button>
          <button className="icon-btn" aria-label="Mes siguiente" disabled={mes >= maxM}
            onClick={() => cambiarMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}><Derecha /></button>
        </div>
      </div>
      <div className="dow">{["L", "M", "M", "J", "V", "S", "D"].map((x, i) => <span key={i}>{x}</span>)}</div>
      <div className="grid" style={{ marginTop: 8 }}>{celdas}</div>
      <div className="legend">
        <span><i className="lg free" />Libre</span>
        <span><i className="lg held" />Reservado</span>
        <span><i className="lg ok" />Confirmado</span>
        <span><i className="lg mine" />Tuyo</span>
      </div>
    </section>
  );
}
