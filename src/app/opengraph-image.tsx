import { ImageResponse } from "next/og";

export const alt = "Missionary Lunch: almuerzo para los misioneros de tu barrio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Imagen que se ve al compartir el enlace en WhatsApp, Facebook, etc.
export default function Imagen() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "#101820", padding: 80, gap: 64 }}>
        <svg width="280" height="280" viewBox="0 0 64 64">
          <rect x="14" y="6" width="36" height="52" rx="7" fill="#fff9f5" />
          <rect x="25" y="12" width="14" height="4" rx="2" fill="#101820" />
          <circle cx="32" cy="33" r="10" fill="none" stroke="#ff5a3c" strokeWidth="3.5" />
          <circle cx="32" cy="33" r="3" fill="#ff5a3c" />
          <rect x="23" y="49" width="18" height="3.5" rx="1.75" fill="#101820" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 84, fontWeight: 800, color: "#fff9f5", lineHeight: 1.05 }}>Missionary Lunch</div>
          <div style={{ fontSize: 40, color: "#b9c4d0", lineHeight: 1.25 }}>Almuerzo para los misioneros de tu barrio</div>
          <div style={{ width: 120, height: 8, background: "#ff5a3c", borderRadius: 4 }} />
        </div>
      </div>
    ),
    size,
  );
}
