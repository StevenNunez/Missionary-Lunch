import { NextResponse } from "next/server";
import { firmarAprobacion } from "@/lib/aprobacion";
import { correoConfigurado, enviarCorreo } from "@/lib/correo";
import { formatearTelefono } from "@/lib/telefono";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Avisa a Teo Labs por correo que se creó un barrio y espera su aprobación.
 * El correo trae un enlace firmado para revisarlo y aprobarlo o rechazarlo con un toque.
 */
export async function POST(req: Request) {
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Entra primero" }, { status: 401 });
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "Falta el barrio" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: b } = await admin
    .from("barrios").select("slug, nombre, unidad, direccion_capilla, estado, creado_por, creado_en").eq("slug", slug).maybeSingle();
  // Solo avisa quien lo creó, mientras esté pendiente y recién creado: así no sirve para mandar correos de más.
  if (!b || b.creado_por !== data.user.id || b.estado !== "pendiente" || Date.now() - new Date(b.creado_en).getTime() > 3600_000) {
    return NextResponse.json({ ok: true, enviado: false });
  }
  const destino = process.env.ADMIN_EMAIL;
  if (!destino || !correoConfigurado()) return NextResponse.json({ ok: true, enviado: false });

  const { data: p } = await admin.from("perfiles").select("nombre").eq("id", b.creado_por).maybeSingle();
  const tel = (data.user.user_metadata as { telefono?: string } | undefined)?.telefono;
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "";
  const url = `${sitio}/admin/barrio?slug=${encodeURIComponent(b.slug)}&t=${firmarAprobacion(b.slug)}`;
  try {
    await enviarCorreo({
      para: destino,
      barrio: b.nombre,
      asunto: `Barrio nuevo por aprobar: ${b.nombre}`,
      vistaPrevia: `${p?.nombre || "Alguien"} creó ${b.nombre} (unidad ${b.unidad ?? "sin número"}).`,
      titulo: "Un barrio espera tu aprobación",
      resumen: [
        ["Barrio", b.nombre],
        ["Unidad", b.unidad ?? "—"],
        ["Capilla", b.direccion_capilla || "—"],
        ["Lo creó", [p?.nombre, data.user.email && !data.user.email.endsWith("@wsp.missionarylunch.test") ? data.user.email : "", tel ? formatearTelefono(tel) : ""].filter(Boolean).join(" · ") || "—"],
      ],
      mensaje: "Revisa que el número de unidad corresponda a un barrio real y que quien lo creó sea el encargado de almuerzos. Hasta que lo apruebes no aparece en el buscador.",
      boton: { texto: "Revisar y decidir", url },
      texto: "",
    });
    return NextResponse.json({ ok: true, enviado: true });
  } catch {
    return NextResponse.json({ ok: true, enviado: false });
  }
}
