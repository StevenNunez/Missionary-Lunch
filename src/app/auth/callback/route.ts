import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Destino del enlace mágico del correo: canjea el código por una sesión. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  // Solo rutas internas: evita redirigir a otro sitio
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }
  return NextResponse.redirect(`${origin}${destino}`);
}
