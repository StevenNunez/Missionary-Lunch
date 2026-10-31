import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { firmaValida } from "@/lib/aprobacion";
import { correoConfigurado, enviarCorreo } from "@/lib/correo";
import { enviarPush } from "@/lib/push";
import { esEmailDeTelefono, formatearTelefono } from "@/lib/telefono";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aprobar barrio", robots: { index: false, follow: false } };

async function decidir(formData: FormData) {
  "use server";
  const slug = String(formData.get("slug") || "");
  const firma = String(formData.get("t") || "");
  const accion = String(formData.get("accion") || "");
  if (!firmaValida(slug, firma) || (accion !== "aprobar" && accion !== "rechazar")) return;

  const admin = supabaseAdmin();
  const { data: b } = await admin.from("barrios").select("id, nombre, estado, creado_por").eq("slug", slug).maybeSingle();
  if (!b || b.estado !== "pendiente") return;

  if (accion === "rechazar") {
    await admin.from("barrios").delete().eq("id", b.id);
    revalidatePath("/admin/barrio");
    return;
  }

  await admin.from("barrios").update({ estado: "aprobado" }).eq("id", b.id);
  revalidatePath("/admin/barrio");

  // Quien lo creó recibe el aviso que se le prometió: ya puede compartir el enlace y el QR.
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || "";
  await enviarPush(b.creado_por, {
    titulo: "Tu barrio ya está habilitado",
    cuerpo: `${b.nombre} quedó aprobado. Ya puedes compartir el enlace y el QR con las familias.`,
    url: `/b/${slug}`, etiqueta: "barrio-aprobado",
  }).catch(() => 0);
  if (correoConfigurado()) {
    const { data: u } = await admin.auth.admin.getUserById(b.creado_por);
    const email = u.user?.email ?? "";
    if (email && !esEmailDeTelefono(email)) {
      await enviarCorreo({
        para: email, barrio: b.nombre,
        asunto: `${b.nombre} ya está habilitado`,
        vistaPrevia: "Ya puedes compartir el enlace y el QR con las familias.",
        titulo: "Tu barrio ya está habilitado",
        resumen: [["Barrio", b.nombre]],
        mensaje: "Ya aparece en el buscador. Comparte el enlace o el afiche con el QR en el grupo de WhatsApp del barrio para que las familias se anoten.",
        boton: { texto: "Abrir mi barrio", url: `${sitio}/b/${slug}` },
        texto: "",
      }).catch(() => {});
    }
  }
}

export default async function AprobarBarrio({ searchParams }: { searchParams: Promise<{ slug?: string; t?: string }> }) {
  const { slug = "", t = "" } = await searchParams;
  const marco = (titulo: string, cuerpo: React.ReactNode) => (
    <>
      <div className="band"><div className="wrap"><h1>{titulo}</h1></div></div>
      <main><div className="wrap stack" style={{ paddingBottom: 32 }}>{cuerpo}</div></main>
    </>
  );

  if (!firmaValida(slug, t)) {
    return marco("Enlace no válido", <div className="card empty">Este enlace no sirve. Usa el que llegó en el correo de aviso.</div>);
  }
  const admin = supabaseAdmin();
  const { data: b } = await admin
    .from("barrios").select("nombre, unidad, direccion_capilla, estado, creado_por, creado_en").eq("slug", slug).maybeSingle();
  if (!b) return marco("Barrio no encontrado", <div className="card empty">Ya fue rechazado o no existe.</div>);

  if (b.estado !== "pendiente") {
    return marco("Barrio aprobado", <div className="card empty"><span className="h2">{b.nombre}</span>Ya está habilitado.</div>);
  }

  const { data: p } = await admin.from("perfiles").select("nombre").eq("id", b.creado_por).maybeSingle();
  const { data: u } = await admin.auth.admin.getUserById(b.creado_por);
  const tel = (u.user?.user_metadata as { telefono?: string } | undefined)?.telefono;
  const email = u.user?.email && !esEmailDeTelefono(u.user.email) ? u.user.email : "";
  const quien = [p?.nombre, email, tel ? formatearTelefono(tel) : ""].filter(Boolean).join(" · ") || "—";

  return marco("Barrio por aprobar", (
    <>
      <div className="card" style={{ display: "grid", gap: 6 }}>
        <span className="h2">{b.nombre}</span>
        <span className="muted">Unidad {b.unidad ?? "sin número"}{b.direccion_capilla ? ` · ${b.direccion_capilla}` : ""}</span>
        <span className="muted">Lo creó: {quien}</span>
        <span className="muted">Fecha: {b.creado_en.slice(0, 10)}</span>
        {b.unidad && (
          <a href={`https://local.churchofjesuschrist.org/u/${b.unidad}`} target="_blank" rel="noopener noreferrer">
            Ver la unidad en la página de la Iglesia
          </a>
        )}
      </div>
      <form action={decidir} className="row">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="t" value={t} />
        <button className="btn" style={{ flex: 1 }} name="accion" value="aprobar">Aprobar</button>
        <button className="btn danger" name="accion" value="rechazar">Rechazar y borrar</button>
      </form>
    </>
  ));
}
