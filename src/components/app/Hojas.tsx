"use client";

import { useState, type ReactNode } from "react";
import { claveDe, hoy, hhmm, largo, relativo, sumarDias } from "@/lib/fechas";
import { guardar, leer, wa } from "@/lib/util";
import type { Almuerzo, Barrio, Modo, Reserva, Rol } from "@/lib/tipos";
import { Chat, IconoModo, Nota, Pin, Reloj, Telefono, Usuario } from "./iconos";

export const MODOS: Record<Modo, { t: string; l: string }> = {
  casa: { t: "En nuestra casa", l: "Almuerzan en nuestra casa" },
  retiro: { t: "Lo retiran", l: "Pasan a retirar la comida" },
  entrega: { t: "Se lo llevamos", l: "Les llevamos la comida" },
};

export type Vista = "miembro" | "mision" | "enc";

export function Hoja({ children, cerrar }: { children: ReactNode; cerrar: () => void }) {
  return (
    <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && cerrar()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

export function Pildora({ a }: { a?: Almuerzo }) {
  if (!a) return <span className="pill p-free">Disponible</span>;
  if (a.miembroConfirmo && a.misionConfirmo) return <span className="pill p-ok">Confirmado ✓</span>;
  if (a.misionConfirmo) return <span className="pill p-held">Misioneros confirmaron</span>;
  if (a.miembroConfirmo) return <span className="pill p-held">Familia confirmó</span>;
  return <span className="pill p-held">Reservado</span>;
}

export function Datos({ a, completo, yo }: { a: Almuerzo; completo: boolean; yo: string }) {
  const Icono = IconoModo[a.modo];
  const filas: [ReactNode, string][] = [
    [<Reloj key="r" />, hhmm(a.hora)],
    [Icono ? <Icono key="m" size={18} /> : <Nota key="m" />, MODOS[a.modo]?.l ?? ""],
  ];
  if ((completo || a.creadoPor === yo) && a.lugar) filas.push([<Pin key="p" />, a.lugar]);
  if (completo) {
    if (a.adultoPresente) filas.push([<Usuario key="u" />, `Presente: ${a.adultoPresente}`]);
    if (a.notas) filas.push([<Nota key="n" />, a.notas]);
    if (a.telefono) filas.push([<Telefono key="t" />, a.telefono]);
  }
  return (
    <div className="facts">
      {filas.map(([icono, texto], i) => (
        <div className="fact" key={i}>{icono}<span>{texto}</span></div>
      ))}
    </div>
  );
}

interface DiaProps {
  fecha: string;
  vista: Vista;
  barrio: Barrio;
  yo: string;
  almuerzoDe: (fecha: string, compId: string) => Almuerzo | undefined;
  cerrar: () => void;
  reservar: (fecha: string, compId: string) => void;
  confirmarMiembro: (a: Almuerzo) => void;
  confirmarMision: (a: Almuerzo) => void;
  liberar: (a: Almuerzo) => void;
}

/** Detalle de un día: un cupo por compañerismo. */
export function HojaDia(p: DiaProps) {
  const { fecha, vista, barrio, yo, almuerzoDe } = p;
  const tk = claveDe(hoy());
  const manana = claveDe(sumarDias(hoy(), 1));
  return (
    <Hoja cerrar={p.cerrar}>
      <div>
        <div className="label">{relativo(fecha) || "Almuerzo"}</div>
        <h2>{largo(fecha)}</h2>
      </div>
      {barrio.companerismos.map((c) => {
        const a = almuerzoDe(fecha, c.id);
        const mio = !!a && a.creadoPor === yo;
        return (
          <div className="slot" key={c.id}>
            <div className="slot-top"><b>{c.nombre}</b><Pildora a={a} /></div>
            {!a ? (
              vista === "enc" ? <span className="muted">Aún sin familia.</span>
              : vista === "mision" ? <span className="muted">Ninguna familia anotada.</span>
              : <button className="btn block" onClick={() => p.reservar(fecha, c.id)}>Dar este almuerzo</button>
            ) : (
              <>
                <span>Familia <b>{a.familia}</b>{mio ? " (tú)" : ""}</span>
                <Datos a={a} completo={vista !== "miembro"} yo={yo} />
                {mio && vista === "miembro" && (
                  <>
                    {!a.miembroConfirmo && (
                      a.fecha === tk || a.fecha === manana
                        ? <button className="btn teal block" onClick={() => p.confirmarMiembro(a)}>Confirmar almuerzo</button>
                        : <span className="muted" style={{ fontSize: 14 }}>Podrás confirmar desde el día anterior.</span>
                    )}
                    <div className="row">
                      <a className="btn sec sm" style={{ flex: 1 }} target="_blank" rel="noopener noreferrer"
                        href={wa(barrio.telefonoMisioneros,
                          `Hola ${c.nombre}, les escribe la familia ${a.familia}. Confirmamos el almuerzo del ${largo(a.fecha).toLowerCase()} a las ${hhmm(a.hora)}. ${MODOS[a.modo].l}${a.lugar ? ": " + a.lugar : ""}.`)}>
                        <Chat /> Avisar a los misioneros
                      </a>
                      <button className="btn danger sm" onClick={() => p.liberar(a)}>Cancelar</button>
                    </div>
                  </>
                )}
                {vista === "mision" && !a.misionConfirmo && (
                  <button className="btn teal block" onClick={() => p.confirmarMision(a)}>Confirmamos</button>
                )}
                {vista === "enc" && (
                  <div className="row">
                    <a className="btn sec sm" style={{ flex: 1 }} target="_blank" rel="noopener noreferrer"
                      href={wa(a.telefono, `Hola familia ${a.familia}, les recuerdo el almuerzo con los ${c.nombre} el ${largo(fecha).toLowerCase()} a las ${hhmm(a.hora)}. ¡Gracias!`)}>
                      <Chat /> Recordar
                    </a>
                    <button className="btn danger sm" onClick={() => p.liberar(a)}>Liberar</button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </Hoja>
  );
}

interface ReservaProps {
  fecha: string;
  compId: string;
  barrio: Barrio;
  cerrar: () => void;
  enviar: (r: Reserva) => Promise<boolean>;
}

export function HojaReserva({ fecha, compId, barrio, cerrar, enviar }: ReservaProps) {
  const comp = barrio.companerismos.find((c) => c.id === compId)!;
  const adulto = comp.tipo === "hermanas" ? "una mujer adulta" : "un hombre adulto";
  const [modo, setModo] = useState<Modo>("casa");
  const [familia, setFamilia] = useState(() => leer("am_familia") ?? "");
  const [telefono, setTelefono] = useState(() => leer("am_tel") ?? "");
  const [hora, setHora] = useState("13:30");
  const [lugar, setLugar] = useState(() => leer("am_dir") ?? "");
  const [adultoPresente, setAdultoPresente] = useState("");
  const [notas, setNotas] = useState("");
  const [ocupado, setOcupado] = useState(false);

  function elegir(m: Modo) {
    setModo(m);
    if (m === "entrega" && !lugar) setLugar(barrio.direccionPension);
  }

  async function enviarForm(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    guardar("am_familia", familia.trim());
    guardar("am_tel", telefono.trim());
    if (modo !== "entrega") guardar("am_dir", lugar.trim());
    const ok = await enviar({
      companerismoId: compId, fecha, familia: familia.trim(), telefono: telefono.trim(), modo, hora,
      lugar: lugar.trim(), adultoPresente: modo === "casa" ? adultoPresente.trim() : "", notas: notas.trim(),
    });
    if (!ok) setOcupado(false);
  }

  return (
    <Hoja cerrar={cerrar}>
      <div>
        <div className="label">{comp.nombre} · {barrio.ventana || "13:00 – 15:00"}</div>
        <h2>{largo(fecha)}</h2>
      </div>
      <form onSubmit={enviarForm} style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>¿Cómo será el almuerzo?</span>
          <div className="choices" role="radiogroup">
            {(Object.keys(MODOS) as Modo[]).map((k) => {
              const Icono = IconoModo[k];
              return (
                <label className="choice" key={k}>
                  <Icono />
                  <input type="radio" name="modo" value={k} checked={modo === k} onChange={() => elegir(k)} />
                  {MODOS[k].t}
                </label>
              );
            })}
          </div>
        </div>
        <div className="grid2">
          <label>Familia<input required value={familia} onChange={(e) => setFamilia(e.target.value)} placeholder="Familia Rojas" maxLength={80} /></label>
          <label>WhatsApp<input inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+56 9…" maxLength={30} /></label>
        </div>
        <div className="grid2">
          <label>Hora<input type="time" required value={hora} onChange={(e) => setHora(e.target.value)} /></label>
          <label>{modo === "entrega" ? "¿Dónde lo entregan?" : "Dirección"}
            <input value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Calle y número" maxLength={200} />
          </label>
        </div>
        {modo === "casa" && (
          <label>¿Quién estará presente?
            <span className="hint">Si comen con alguien del sexo opuesto, debe estar {adulto} (Normas misionales 2.4.5).</span>
            <input value={adultoPresente} onChange={(e) => setAdultoPresente(e.target.value)} placeholder="Ej.: Hno. Juan Rojas" maxLength={80} />
          </label>
        )}
        <label>Notas <span className="hint">Opcional: cómo llegar, menú…</span>
          <input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={300} />
        </label>
        {barrio.alergias && <div className="hint-box"><b>Alergias o restricciones:</b> {barrio.alergias}</div>}
        <div className="hint-box">Los misioneros compartirán un mensaje de 15–20 minutos. El día anterior te pediremos confirmar.</div>
        <button className="btn block" type="submit" disabled={ocupado}>{ocupado ? "Reservando…" : "Reservar este día"}</button>
      </form>
    </Hoja>
  );
}

export function HojaLiberar({ a, cerrar, confirmar, rol }: { a: Almuerzo; cerrar: () => void; confirmar: () => void; rol: Rol }) {
  return (
    <Hoja cerrar={cerrar}>
      <h2>¿Liberar el almuerzo del {largo(a.fecha).toLowerCase()}?</h2>
      <p className="muted" style={{ margin: 0 }}>
        El día quedará disponible para otra familia. {rol === "encargado" ? "Avisa también a la familia." : "Avisa también a los misioneros."}
      </p>
      <div className="row">
        <button className="btn danger" style={{ flex: 1 }} onClick={confirmar}>Sí, liberar</button>
        <button className="btn sec" style={{ flex: 1 }} onClick={cerrar}>Volver</button>
      </div>
    </Hoja>
  );
}
