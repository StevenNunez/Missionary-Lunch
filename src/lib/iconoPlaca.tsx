/** Ícono de la app (placa de cuello) sobre fondo de marca, para favicon, PWA y apple-touch. */
export const FONDO = "#101820";

export function iconoPlaca(px: number, escala: number, radio = 0) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: FONDO, borderRadius: radio }}>
      <svg width={px * escala} height={px * escala} viewBox="0 0 64 64">
        <rect x="14" y="6" width="36" height="52" rx="7" fill="#fff9f5" />
        <rect x="25" y="12" width="14" height="4" rx="2" fill={FONDO} />
        <circle cx="32" cy="33" r="10" fill="none" stroke="#ff5a3c" strokeWidth="3.5" />
        <circle cx="32" cy="33" r="3" fill="#ff5a3c" />
        <rect x="23" y="49" width="18" height="3.5" rx="1.75" fill={FONDO} />
      </svg>
    </div>
  );
}
