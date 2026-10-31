// Aprobación de barrios nuevos (la hace Teo Labs). Las credenciales salen de .env.local.
//   npm run barrios                    lista los barrios pendientes
//   npm run barrios -- aprobar <slug>  habilita un barrio
//   npm run barrios -- rechazar <slug> borra un barrio pendiente (libera su número de unidad)
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env.local"); } catch { /* las variables pueden venir del entorno */ }

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });
const [accion, slug] = process.argv.slice(2);

if (!accion || accion === "pendientes") {
  const { data, error } = await admin
    .from("barrios").select("slug, nombre, unidad, direccion_capilla, creado_en, creado_por")
    .eq("estado", "pendiente").order("creado_en");
  if (error) throw error;
  if (!data.length) console.log("No hay barrios pendientes.");
  for (const b of data) {
    const { data: u } = await admin.auth.admin.getUserById(b.creado_por);
    const { data: p } = await admin.from("perfiles").select("nombre").eq("id", b.creado_por).maybeSingle();
    const quien = [p?.nombre, u?.user?.email, u?.user?.user_metadata?.telefono].filter(Boolean).join(" · ");
    console.log(`${b.slug}\n  ${b.nombre} · unidad ${b.unidad ?? "—"} · ${b.direccion_capilla || "sin dirección"}\n  creado por: ${quien || b.creado_por} el ${b.creado_en.slice(0, 10)}`);
  }
} else if ((accion === "aprobar" || accion === "rechazar") && slug) {
  const { data: b } = await admin.from("barrios").select("id, estado").eq("slug", slug).maybeSingle();
  if (!b) { console.error(`No existe el barrio "${slug}".`); process.exit(1); }
  if (accion === "aprobar") {
    const { error } = await admin.from("barrios").update({ estado: "aprobado" }).eq("id", b.id);
    if (error) throw error;
    console.log(`Aprobado: ${slug}`);
  } else {
    if (b.estado !== "pendiente") { console.error("Solo se rechazan barrios pendientes."); process.exit(1); }
    const { error } = await admin.from("barrios").delete().eq("id", b.id);
    if (error) throw error;
    console.log(`Rechazado y borrado: ${slug}`);
  }
} else {
  console.error("Uso: npm run barrios [-- aprobar|rechazar <slug>]");
  process.exit(1);
}
