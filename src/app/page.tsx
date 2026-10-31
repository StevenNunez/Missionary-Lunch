import Inicio from "@/components/app/Inicio";

const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || "https://missionarylunch.teolabs.app").replace(/\/$/, "");

// Datos estructurados: describen la app a buscadores y asistentes.
const ldjson = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Missionary Lunch",
  url: SITIO,
  description: "Calendario por barrio para dar almuerzo a los misioneros: anotarse, confirmar a diario y recibir recordatorios.",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web, Android, iOS",
  inLanguage: "es",
  offers: { "@type": "Offer", price: "0", priceCurrency: "CLP" },
  creator: { "@type": "Organization", name: "Teo Labs", url: "https://www.teolabs.app" },
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldjson) }} />
      <Inicio />
    </>
  );
}
