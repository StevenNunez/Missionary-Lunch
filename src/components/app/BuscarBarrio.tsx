"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { obtenerRepo } from "@/lib/repo";
import type { BarrioPublico } from "@/lib/tipos";

/** Buscador público: nombre o número de unidad. Solo muestra nombre, unidad y dirección de la capilla. */
export default function BuscarBarrio({ titulo = "Busca tu barrio" }: { titulo?: string }) {
  const repo = useMemo(() => obtenerRepo(), []);
  const [texto, setTexto] = useState("");
  const [res, setRes] = useState<BarrioPublico[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = texto.trim();
    setError("");
    if (t.length < 3) { setRes(null); return; }
    let vigente = true;
    const espera = setTimeout(() => {
      repo.buscarBarrios(t)
        .then((r) => { if (vigente) setRes(r); })
        .catch(() => { if (vigente) setError("No se pudo buscar. Revisa tu conexión."); });
    }, 300);
    return () => { vigente = false; clearTimeout(espera); };
  }, [texto, repo]);

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <span className="h2">{titulo}</span>
      <label>
        Nombre del barrio o número de unidad
        <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={80}
          placeholder="Ej.: Brillador" autoComplete="off" enterKeyHint="search" />
      </label>
      {error && <span className="error" role="alert">{error}</span>}
      {res && res.length > 0 && (
        <div className="barrio-list">
          {res.map((b) => (
            <Link key={b.slug} href={`/b/${b.slug}`} className="card barrio-item" style={{ display: "grid", gap: 2 }}>
              <b>{b.nombre}</b>
              {(b.direccion || b.unidad) && (
                <span className="muted" style={{ fontSize: 14 }}>
                  {[b.direccion, b.unidad && `Unidad ${b.unidad}`].filter(Boolean).join(" · ")}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
      {res && res.length === 0 && (
        <p className="muted" style={{ margin: 0 }}>
          No encontramos ese barrio. Prueba con otra parte del nombre o con el número de unidad. Si aún no está,
          pídele al encargado de almuerzos que lo cree y te comparta el enlace.
        </p>
      )}
      {!res && texto.trim().length > 0 && texto.trim().length < 3 && (
        <p className="muted" style={{ margin: 0 }}>Escribe al menos 3 letras.</p>
      )}
    </div>
  );
}
