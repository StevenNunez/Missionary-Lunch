import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import RegistrarSW from "@/components/RegistrarSW";
import "./globals.css";

// Tipografías propias de la app, servidas desde el mismo dominio: sin parpadeo ni salto al cargar.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const cuerpo = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body", display: "swap" });

const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || "https://missionarylunch.teolabs.app").replace(/\/$/, "");
const DESCRIPCION =
  "Anótate para dar almuerzo a los misioneros de tu barrio. Calendario por barrio, confirmación a diario y recordatorios en tu celular. Gratis.";

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: { default: "Missionary Lunch · Almuerzo para los misioneros de tu barrio", template: "%s · Missionary Lunch" },
  description: DESCRIPCION,
  applicationName: "Missionary Lunch",
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  appleWebApp: { capable: true, title: "Missionary Lunch", statusBarStyle: "black-translucent" },
  // La portada se puede encontrar; los calendarios de cada barrio (/b/…) se marcan privados en su propio layout.
  robots: { index: true, follow: true },
  openGraph: {
    type: "website", locale: "es_CL", siteName: "Missionary Lunch", url: "/",
    title: "Missionary Lunch · Almuerzo para los misioneros de tu barrio",
    description: DESCRIPCION,
  },
  twitter: { card: "summary_large_image", title: "Missionary Lunch", description: DESCRIPCION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101820",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${cuerpo.variable}`}>
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
