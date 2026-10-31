import type { MetadataRoute } from "next";

const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || "https://missionarylunch.teolabs.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/b/", "/api/", "/admin/", "/auth/"] }],
    sitemap: `${SITIO}/sitemap.xml`,
    host: SITIO,
  };
}
