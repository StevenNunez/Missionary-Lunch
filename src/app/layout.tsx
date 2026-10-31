import type { Metadata, Viewport } from "next";
import RegistrarSW from "@/components/RegistrarSW";
import "./globals.css";

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
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
