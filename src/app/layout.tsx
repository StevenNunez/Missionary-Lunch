import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import RegistrarSW from "@/components/RegistrarSW";
import "./globals.css";

// Tipografías propias de la app, servidas desde el mismo dominio: sin parpadeo ni salto al cargar.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const cuerpo = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Missionary Lunch", template: "%s · Missionary Lunch" },
  description: "Anótate para dar almuerzo a los misioneros de tu barrio y confirma a diario.",
  applicationName: "Missionary Lunch",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Missionary Lunch", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
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
