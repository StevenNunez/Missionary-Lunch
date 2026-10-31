import { NextResponse } from "next/server";
import { correoConfigurado, enviarCorreo, type CorreoDatos } from "@/lib/correo";
import { enviarPush, pushConfigurado, type AvisoPush } from "@/lib/push";
import { esEmailDeTelefono } from "@/lib/telefono";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Fecha de mañana (YYYY-MM-DD) en la zona horaria del barrio. */
function mananaEn(zona: string): string {
  const t = new Date(Date.now() + 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(t);
}

/**
 * Recordatorio de la noche anterior (Vercel Cron, una vez al día):
 *  - a cada familia con almuerzo mañana sin confirmar
 *  - a los misioneros y al encargado, con el plan de mañana
 * Llega por aviso push al celular (sirve para las cuentas de WhatsApp, que no tienen correo)
 * y por correo cuando la cuenta tiene uno real.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const conCorreo = correoConfigurado();
  const conPush = pushConfigurado();
  if (!conCorreo && !conPush) return NextResponse.json({ enviados: 0, aviso: "Ni SMTP ni avisos push están configurados" });

  const admin = supabaseAdmin();
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "";
  const { data: barrios, error } = await admin
    .from("barrios").select("id, slug, nombre, zona_horaria, ventana").eq("estado", "aprobado");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const correos = new Map<string, string>();
  const emailDe = async (id: string) => {
    if (!correos.has(id)) {
      const { data } = await admin.auth.admin.getUserById(id);
      // Las cuentas creadas con WhatsApp no tienen correo real: reciben el aviso push.
      const email = data.user?.email ?? "";
      correos.set(id, esEmailDeTelefono(email) ? "" : email);
    }
    return correos.get(id)!;
  };

  let enviados = 0;
  const fallos: string[] = [];

  /** Avisa por push y, si la cuenta tiene correo real, también por correo. */
  async function avisar(slug: string, userId: string, push: AvisoPush, correo: Omit<CorreoDatos, "para">) {
    try {
      if (conPush && (await enviarPush(userId, push)) > 0) enviados++;
    } catch (e) {
      fallos.push(`${slug} (push): ${e instanceof Error ? e.message : "error"}`);
    }
    if (!conCorreo) return;
    const para = await emailDe(userId);
    if (!para) return;
    try {
      await enviarCorreo({ ...correo, para });
      enviados++;
    } catch (e) {
      fallos.push(`${slug} (correo): ${e instanceof Error ? e.message : "error"}`);
    }
  }

  for (const b of barrios ?? []) {
    const fecha = mananaEn(b.zona_horaria);
    const [y, m, d] = fecha.split("-").map(Number);
    const dia = `${DIAS[new Date(y, m - 1, d).getDay()]} ${d}`;
    const url = `${sitio}/b/${b.slug}`;
    const ruta = `/b/${b.slug}`;

    const { data: almuerzos } = await admin
      .from("almuerzos")
      .select("id, familia, hora, modo, miembro_confirmo, creado_por, companerismos(nombre), almuerzo_detalle(lugar)")
      .eq("barrio_id", b.id).eq("fecha", fecha).eq("estado", "reservado");
    if (!almuerzos?.length) continue;

    for (const a of almuerzos) {
      if (a.miembro_confirmo) continue;
      const hora = String(a.hora).slice(0, 5);
      await avisar(
        b.slug, a.creado_por,
        {
          titulo: "Confirma tu almuerzo de mañana",
          cuerpo: `Los misioneros te esperan el ${dia} a las ${hora}. Toca para confirmar con un solo toque.`,
          url: ruta, etiqueta: `confirmar-${a.id}`,
        },
        {
          barrio: b.nombre,
          asunto: `Confirma tu almuerzo de mañana (${dia})`,
          vistaPrevia: `Los misioneros planifican esta noche: confirma tu almuerzo del ${dia}.`,
          titulo: "Confirma el almuerzo de mañana",
          resumen: [
            ["Día", dia],
            ["Misioneros", (a.companerismos as unknown as { nombre: string } | null)?.nombre ?? ""],
            ["Hora", hora],
            ["Forma", { casa: "En su casa", retiro: "Lo retiran", entrega: "Se lo llevan" }[a.modo as string] ?? ""],
          ],
          mensaje: "Gracias por darles almuerzo. Los misioneros planifican cada noche: confirma con un toque, o cancela si no puedes.",
          boton: { texto: "Confirmar almuerzo", url },
          texto: "",
        },
      );
    }

    // Plan del día siguiente para misioneros y encargado
    const { data: roles } = await admin.from("roles_barrio").select("user_id").eq("barrio_id", b.id).in("rol", ["misionero", "encargado"]);
    const resumen: [string, string][] = almuerzos.map((a) => [
      (a.companerismos as unknown as { nombre: string } | null)?.nombre ?? "Misioneros",
      `Familia ${a.familia} · ${String(a.hora).slice(0, 5)}`,
    ]);
    for (const r of roles ?? []) {
      await avisar(
        b.slug, r.user_id,
        {
          titulo: `Almuerzos de mañana (${dia})`,
          cuerpo: `${almuerzos.length} almuerzo(s) en ${b.nombre}. Toca para ver el plan y confirmar.`,
          url: ruta, etiqueta: `plan-${b.slug}`,
        },
        {
          barrio: b.nombre,
          asunto: `Almuerzos de mañana (${dia})`,
          vistaPrevia: `${almuerzos.length} almuerzo(s) para el ${dia}.`,
          titulo: `Plan de mañana · ${dia}`,
          resumen,
          mensaje: "Confirma en la app cada almuerzo del plan. Allí están los teléfonos y direcciones de las familias.",
          boton: { texto: "Abrir el plan", url },
          texto: "",
        },
      );
    }
  }
  return NextResponse.json({ enviados, fallos });
}
