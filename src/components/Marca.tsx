/** Placa de cuello: placa vertical con broche y un plato al centro. */
export function IconoMarca({
  placa = "var(--band-ink)",
  plato = "var(--sun)",
  detalle = "var(--band)",
}: {
  placa?: string;
  plato?: string;
  detalle?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="14" y="6" width="36" height="52" rx="7" fill={placa} />
      <rect x="25" y="12" width="14" height="4" rx="2" fill={detalle} />
      <circle cx="32" cy="33" r="10" fill="none" stroke={plato} strokeWidth="3.5" />
      <circle cx="32" cy="33" r="3" fill={plato} />
      <rect x="23" y="49" width="18" height="3.5" rx="1.75" fill={detalle} />
    </svg>
  );
}

export const NOMBRE_APP = "Missionary Lunch";

/** Ícono + nombre, para la franja superior. */
export function Marca({ prefijo }: { prefijo?: string }) {
  return (
    <span className="hello marca">
      <IconoMarca />
      <span>{prefijo ? `${prefijo} · ${NOMBRE_APP}` : NOMBRE_APP}</span>
    </span>
  );
}
