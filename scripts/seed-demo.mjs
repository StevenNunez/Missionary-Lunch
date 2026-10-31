// Crea (o actualiza) el barrio demo con datos realistas y el usuario demo.
// Idempotente: se puede correr de nuevo sin duplicar. Las credenciales salen de .env.local.
//   npm run demo:seed
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env.local"); } catch { /* las variables pueden venir del entorno */ }

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, DEMO_EMAIL: email, NEXT_PUBLIC_SITE_URL: sitio } = process.env;
if (!url || !key || !email) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o DEMO_EMAIL en .env.local");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });
const SLUG = "demo-las-companias";

async function usuario(correo, nombre) {
  let id;
  const { data, error } = await admin.auth.admin.createUser({ email: correo, email_confirm: true });
  if (error) {
    // Ya existe: se busca por correo
    const lista = await admin.auth.admin.listUsers({ perPage: 1000 });
    id = lista.data.users.find((u) => u.email === correo)?.id;
    if (!id) throw error;
  } else id = data.user.id;
  await admin.from("perfiles").upsert({ id, nombre });
  return id;
}

const [local, dominio] = email.split("@");
const alias = (n) => `${local}+${n}@${dominio}`;
const yo = await usuario(email, "Hna. Carolina Pérez (demo)");
const familias = {
  rojas: await usuario(alias("rojas"), "Hno. Matías Rojas"),
  fuentes: await usuario(alias("fuentes"), "Hna. Daniela Fuentes"),
  araya: await usuario(alias("araya"), "Hno. Pablo Araya"),
  munoz: await usuario(alias("munoz"), "Hna. Paula Muñoz"),
};
const elder = await usuario(alias("elder"), "Élder Ramírez");

let { data: barrio } = await admin.from("barrios").select("id").eq("slug", SLUG).maybeSingle();
if (!barrio) {
  ({ data: barrio } = await admin.from("barrios").insert({
    slug: SLUG, nombre: "Barrio Las Compañías (demo)", creado_por: yo,
    encargado_nombre: "Hna. Carolina Pérez", telefono_encargado: "+56 9 5555 0101",
    telefono_misioneros: "+56 9 5555 0202", direccion_pension: "Los Aromos 1450, depto. 3, La Serena",
    alergias: "Élder Soto: alérgico a los mariscos.", dias_sin_almuerzo: [0, 1],
  }).select("id").single());
  await admin.from("barrio_secretos").insert({ barrio_id: barrio.id, codigo_misioneros: "DEMO2026" });
}
const bid = barrio.id;

await admin.from("roles_barrio").upsert([
  { user_id: yo, barrio_id: bid, rol: "encargado" },
  { user_id: elder, barrio_id: bid, rol: "misionero" },
  ...Object.values(familias).map((user_id) => ({ user_id, barrio_id: bid, rol: "miembro" })),
]);

let { data: comps } = await admin.from("companerismos").select("id, orden").eq("barrio_id", bid).order("orden");
if (!comps?.length) {
  ({ data: comps } = await admin.from("companerismos").insert([
    { barrio_id: bid, nombre: "Élderes Ramírez y Soto", tipo: "elderes", orden: 0 },
    { barrio_id: bid, nombre: "Hermanas Vargas y Lee", tipo: "hermanas", orden: 1 },
  ]).select("id, orden").order("orden"));
}

// Próximos días con almuerzo (sin domingo ni lunes)
const dias = [];
for (let n = 1; dias.length < 6; n++) {
  const d = new Date(Date.now() + n * 864e5);
  if (![0, 1].includes(d.getDay())) dias.push(d.toISOString().slice(0, 10));
}
const plan = [
  [0, 0, "Familia Rojas", "rojas", "casa", "13:30", "Av. del Mar 220", "Hno. Matías Rojas", true],
  [0, 1, "Familia Fuentes", "fuentes", "retiro", "14:00", "Cisternas 80", "", false],
  [1, 0, "Familia Araya", "araya", "entrega", "13:15", "Los Aromos 1450, depto. 3", "", false],
  [2, 0, "Familia Muñoz", "munoz", "casa", "13:30", "Brasil 710", "Hno. Andrés Muñoz", false],
  [3, 1, "Familia Rojas", "rojas", "casa", "14:00", "Av. del Mar 220", "Hna. Camila Rojas", false],
];
for (const [i, c, familia, quien, modo, hora, lugar, adulto, conf] of plan) {
  const fecha = dias[i];
  const { data: ya } = await admin.from("almuerzos").select("id").eq("barrio_id", bid).eq("fecha", fecha)
    .eq("companerismo_id", comps[c].id).eq("estado", "reservado").maybeSingle();
  if (ya) continue;
  const { data: a, error } = await admin.from("almuerzos").insert({
    barrio_id: bid, companerismo_id: comps[c].id, fecha, familia, modo, hora,
    creado_por: familias[quien], miembro_confirmo: conf, mision_confirmo: false,
  }).select("id").single();
  if (error) throw error;
  await admin.from("almuerzo_detalle").insert({ almuerzo_id: a.id, telefono: "+56 9 5555 0300", lugar, adulto_presente: adulto, notas: "" });
}

// Enlace de acceso directo (sin enviar correo)
const { data: link } = await admin.auth.admin.generateLink({
  type: "magiclink", email, options: { redirectTo: `${sitio || "http://localhost:3000"}/auth/callback?next=/b/${SLUG}` },
});
console.log(`Listo. Barrio demo: /b/${SLUG}`);
console.log("Código de misioneros del demo: DEMO2026");
console.log(`Para entrar por la pantalla de login: correo ${email} y código ${link?.properties?.email_otp} (un solo uso, vence pronto).`);
