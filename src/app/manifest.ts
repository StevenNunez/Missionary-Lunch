import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Missionary Lunch",
    short_name: "Missionary Lunch",
    description: "Anótate para dar almuerzo a los misioneros de tu barrio.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f5f7",
    theme_color: "#101820",
    lang: "es",
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/pwa/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
