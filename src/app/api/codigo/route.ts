import { NextResponse } from "next/server";
import { correoConfigurado, enviarCorreo } from "@/lib/correo";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Freno básico contra el abuso (por correo y por IP). En serverless es por instancia: es un respaldo, no la única defensa.
const ultimos = new Map<string, number>();
function muyPronto(clave: string, ms: number) {
  const ahora = Date.now();
  for (const [k, t] of ultimos) if (ahora - t > 10 * 60_000) ultimos.delete(k);
  if (ahora - (ultimos.get(clave) ?? 0) < ms) return true;
  ultimos.set(clave, ahora);
  return false;
}

/**
 * Código de acceso para encargado y misioneros, enviado desde nuestro propio correo (hola@teolabs.app).
 * Así el correo lleva la cara de la app, solo trae el código (sin enlaces que apunten a otro dominio)
 * y no depende del límite del correo integrado de Supabase.
 */
export async function POST(req: Request) {
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const correo = (email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo) || correo.length > 120) {
    return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
  }
  if (!correoConfigurado()) return NextResponse.json({ error: "El envío de correos no está disponible." }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (muyPronto(`c:${correo}`, 45_000) || muyPronto(`i:${ip}`, 5_000)) {
    return NextResponse.json({ error: "Espera un momento antes de pedir otro código." }, { status: 429 });
  }

  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "magiclink", email: correo });
  const codigo = data?.properties?.email_otp;
  if (error || !codigo) return NextResponse.json({ error: "No se pudo generar el código." }, { status: 500 });

  try {
    await enviarCorreo({
      para: correo,
      barrio: "Código de acceso",
      asunto: `Tu código de acceso: ${codigo}`,
      vistaPrevia: `Tu código es ${codigo}. Vale por una hora.`,
      titulo: "Tu código para entrar",
      resumen: [],
      mensaje: "Escribe este código en la app para entrar. Vale por una hora. Si no lo pediste, ignora este correo.",
      codigo,
    });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar el correo. Intenta de nuevo." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
