import type { MetadataRoute } from "next";

const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || "https://missionarylunch.teolabs.app").replace(/\/$/, "");

// Solo la portada: los barrios son privados y no se listan.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITIO}/`, changeFrequency: "monthly", priority: 1 }];
}
