import type { Metadata } from "next";

// El calendario de cada barrio se comparte por enlace o QR; no debe aparecer en buscadores.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function BarrioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
