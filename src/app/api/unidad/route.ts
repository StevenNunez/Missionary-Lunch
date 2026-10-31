import { NextResponse } from "next/server";

/**
 * Nombre y dirección de la capilla de una unidad, leídos de su página pública en el sitio de la Iglesia.
 * Una consulta por barrio, solo al crearlo. Si falla, el encargado escribe el nombre a mano.
 */

const ORIGEN = "https://local.churchofjesuschrist.org/";

type Nodo = { "@type"?: string; name?: string; address?: { streetAddress?: string; addressLocality?: string } };

function organizacion(html: string): Nodo | null {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]) as { "@graph"?: (Nodo | null)[] } & Nodo;
      const nodos = [j, ...(j["@graph"] ?? [])];
      const org = nodos.find((n) => n && n["@type"] === "Organization" && n.name);
      if (org) return org;
    } catch { /* bloque que no es JSON válido */ }
  }
  return null;
}

export async function GET(req: Request) {
  const n = new URL(req.url).searchParams.get("n") ?? "";
  if (!/^\d{4,9}$/.test(n)) return NextResponse.json({ error: "Número inválido" }, { status: 400 });
  try {
    const res = await fetch(`${ORIGEN}u/${n}`, {
      headers: { "User-Agent": "MissionaryLunch (+https://www.teolabs.app)" },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86400 },
    });
    if (!res.ok || !res.url.startsWith(ORIGEN)) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    const org = organizacion(await res.text());
    if (!org?.name) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    const dir = [org.address?.streetAddress, org.address?.addressLocality].filter(Boolean).join(", ");
    return NextResponse.json({ nombre: org.name, direccion: dir });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar" }, { status: 502 });
  }
}
