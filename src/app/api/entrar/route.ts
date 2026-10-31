import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { emailDeTelefono, formatearTelefono, normalizarTelefono } from "@/lib/telefono";

/**
 * Ingreso con nombre y número de WhatsApp, sin código: igual que anotarse en la hoja de papel.
 * La cuenta se identifica por el número. Como el número no se verifica, las cuentas con rol de
 * encargado o misionero NO pueden entrar por aquí: esas entran con correo.
 */

// Freno básico por IP (por instancia). Evita probar números en masa.
const intentos = new Map<string, { n: number; hasta: number }>();
function demasiados(ip: string) {
  const ahora = Date.now();
  const e = intentos.get(ip);
  if (!e || e.hasta < ahora) {
    intentos.set(ip, { n: 1, hasta: ahora + 60_000 });
    return false;
  }
  e.n += 1;
  return e.n > 12;
}

const error = (mensaje: string, status: number) => NextResponse.json({ error: mensaje }, { status });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (demasiados(ip)) return error("Demasiados intentos. Espera un minuto.", 429);

  const cuerpo = (await request.json().catch(() => null)) as { nombre?: unknown; telefono?: unknown } | null;
  const nombre = typeof cuerpo?.nombre === "string" ? cuerpo.nombre.trim().replace(/\s+/g, " ") : "";
  const tel = typeof cuerpo?.telefono === "string" ? normalizarTelefono(cuerpo.telefono) : null;
  if (nombre.length < 2 || nombre.length > 60) return error("Escribe tu nombre.", 400);
  if (!tel) return error("Revisa tu número de WhatsApp. Ejemplo: 9 1234 5678.", 400);

  const admin = supabaseAdmin();
  const email = emailDeTelefono(tel);

  const { error: eCrear } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { telefono: formatearTelefono(tel) },
  });
  if (eCrear && !/already|registered|exists/i.test(eCrear.message)) return error("No se pudo entrar. Intenta de nuevo.", 500);

  const { data: enlace, error: eEnlace } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (eEnlace || !enlace?.user || !enlace.properties?.email_otp) return error("No se pudo entrar. Intenta de nuevo.", 500);
  const userId = enlace.user.id;

  const { data: privilegios } = await admin
    .from("roles_barrio").select("rol").eq("user_id", userId).in("rol", ["encargado", "misionero"]).limit(1);
  if (privilegios?.length) return error("Esta cuenta es de encargado o misionero. Entra con tu correo.", 403);

  const sb = await supabaseServer();
  const { data, error: eSesion } = await sb.auth.verifyOtp({ email, token: enlace.properties.email_otp, type: "email" });
  if (eSesion || !data.session) return error("No se pudo entrar. Intenta de nuevo.", 500);

  // El nombre solo se guarda la primera vez: otra persona que escriba el mismo número no lo cambia.
  const { data: perfil } = await admin.from("perfiles").select("nombre").eq("id", userId).maybeSingle();
  if (!perfil?.nombre) await admin.from("perfiles").upsert({ id: userId, nombre });

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    telefono: formatearTelefono(tel),
  });
}
