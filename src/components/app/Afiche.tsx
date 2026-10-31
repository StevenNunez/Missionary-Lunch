"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Creditos from "@/components/Creditos";
import { IconoMarca, NOMBRE_APP } from "@/components/Marca";
import QrBarrio from "@/components/QrBarrio";
import { obtenerRepo } from "@/lib/repo";
import type { BarrioPublico } from "@/lib/tipos";

const PASOS = [
  "Escanea el código con la cámara de tu celular, o entra al enlace de abajo.",
  "Escribe tu nombre y tu número de WhatsApp.",
  "Elige un día libre en el calendario. ¡Listo!",
];

/** Hoja tamaño carta/A4 para imprimir y pegar en el tablero de la capilla. Siempre en claro, también al imprimir. */
export default function Afiche({ slug }: { slug: string }) {
  const repo = useMemo(() => obtenerRepo(), []);
  const [barrio, setBarrio] = useState<BarrioPublico | null | undefined>(undefined);
  const [enlace, setEnlace] = useState("");

  useEffect(() => {
    setEnlace(`${location.origin}/b/${slug}`);
    repo.barrioPublico(slug).then(setBarrio, () => setBarrio(null));
  }, [repo, slug]);

  if (barrio === undefined) return <main><div className="wrap"><div className="card empty">Preparando el afiche…</div></div></main>;
  if (barrio === null) {
    return <main><div className="wrap"><div className="card empty">Este barrio no existe.<Link className="btn" href="/">Ir al inicio</Link></div></div></main>;
  }

  const local = /localhost|127\.0\.0\.1/.test(enlace);
  const url = enlace.replace(/^https?:\/\//, "");

  return (
    <div className="afiche-pagina">
      <div className="afiche-controles no-print">
        <Link className="btn sec sm" href={`/b/${slug}`}>← Volver</Link>
        <button className="btn sm" onClick={() => window.print()}>Imprimir afiche</button>
      </div>
      {local && (
        <p className="no-print error" style={{ textAlign: "center", margin: 0 }}>
          Este enlace es de tu computador (localhost). Imprime el afiche desde el sitio real para que el QR funcione.
        </p>
      )}

      <article className="afiche">
        <header className="afiche-cab">
          <span className="afiche-icono"><IconoMarca placa="#101820" plato="#ff5a3c" detalle="#fff9f5" /></span>
          <span>{NOMBRE_APP}</span>
        </header>

        <h1>Almuerzo para los misioneros</h1>
        <p className="afiche-barrio">{barrio.nombre}</p>
        {barrio.direccion && <p className="afiche-dir">{barrio.direccion}</p>}

        <div className="afiche-qr">
          <QrBarrio texto={enlace || "https://"} etiqueta={`Código QR para entrar al calendario de ${barrio.nombre}`} tam={300} />
        </div>
        <p className="afiche-url">{url}</p>

        <ol className="afiche-pasos">
          {PASOS.map((p, i) => <li key={i}><span>{i + 1}</span>{p}</li>)}
        </ol>

        <Creditos />
      </article>
    </div>
  );
}
