import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Solo los servicios de push de los navegadores: así el servidor no puede ser usado para llamar a direcciones arbitrarias. */
const SERVICIOS_PUSH = [
  /^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)notify\.windows\.com$/,
  /(^|\.)push\.apple\.com$/,
];
function endpointPermitido(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && !u.port && SERVICIOS_PUSH.some((r) => r.test(u.hostname));
  } catch {
    return false;
  }
}

async function usuario() {
  const { data } = await (await supabaseServer()).auth.getUser();
  return data.user;
}

/** Guarda la suscripción push de este dispositivo para la persona con sesión. */
export async function POST(req: Request) {
  const u = await usuario();
  if (!u) return NextResponse.json({ error: "Entra primero" }, { status: 401 });
  const s = (await req.json().catch(() => null)) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | null;
  if (!s?.endpoint || !endpointPermitido(s.endpoint) || !s.keys?.p256dh || !s.keys.auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from("push_suscripciones").upsert(
    { user_id: u.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Quita la suscripción de este dispositivo. */
export async function DELETE(req: Request) {
  const u = await usuario();
  if (!u) return NextResponse.json({ error: "Entra primero" }, { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await supabaseAdmin().from("push_suscripciones").delete().eq("user_id", u.id).eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
