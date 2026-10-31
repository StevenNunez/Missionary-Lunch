import nodemailer from "nodemailer";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * SMTP de Teo Labs (Zoho, casilla hola@teolabs.app). Acepta los nombres que ya usan las demás apps
 * (EMAIL_*, ZOHO_SMTP_*) además de SMTP_*, para no inventar variables nuevas en cada proyecto.
 */
const env = (...nombres: string[]) => nombres.map((n) => process.env[n]?.trim()).find(Boolean) ?? "";
const smtp = () => ({
  host: env("SMTP_HOST", "EMAIL_HOST") || "smtp.zoho.com",
  port: Number(env("SMTP_PORT", "EMAIL_PORT") || 465),
  user: env("SMTP_USER", "EMAIL_USER", "ZOHO_SMTP_USER"),
  pass: env("SMTP_PASS", "EMAIL_PASS", "ZOHO_SMTP_PASS"),
});

export const correoConfigurado = () => Boolean(smtp().user && smtp().pass);

function transporte() {
  const { host, port, user, pass } = smtp();
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

const PUNTOS = [[37, 99, 235], [168, 85, 247], [34, 197, 94]]; // azul → morado → verde

/** Los clientes de correo no hacen texto con degradado: cada letra lleva su color. */
function teoLabsDegradado(): string {
  const texto = "Teo Labs";
  const n = texto.length - 1;
  return [...texto]
    .map((ch, i) => {
      const t = (i / n) * (PUNTOS.length - 1);
      const a = PUNTOS[Math.floor(t)];
      const b = PUNTOS[Math.min(Math.ceil(t), PUNTOS.length - 1)];
      const f = t - Math.floor(t);
      const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
      return `<span style="color:rgb(${c.join(",")});font-weight:700">${esc(ch)}</span>`;
    })
    .join("");
}

export interface CorreoDatos {
  para: string;
  asunto: string;
  vistaPrevia: string;
  titulo: string;
  barrio: string;
  /** Líneas de resumen: [etiqueta, valor] */
  resumen: [string, string][];
  mensaje: string;
  /** Botón de acción; los correos de código no lo llevan. */
  boton?: { texto: string; url: string };
  /** Código para escribir en la app: se muestra grande. */
  codigo?: string;
  texto?: string;
}

export async function enviarCorreo(d: CorreoDatos) {
  const filas = d.resumen
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#5b6672;font-size:14px;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:#101820;font-size:15px;font-weight:700">${esc(v)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f4f5f7;font-family:Segoe UI,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(d.vistaPrevia)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="background:#101820;border-radius:18px 18px 0 0;padding:20px 24px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:12px;vertical-align:middle"><img src="${esc(process.env.NEXT_PUBLIC_SITE_URL || "")}/pwa/192" width="44" height="44" alt="Missionary Lunch" style="display:block;border-radius:10px"></td>
<td style="vertical-align:middle"><div style="font-size:22px;font-weight:800;color:#fff9f5">Missionary Lunch</div>
<div style="font-size:14px;color:#b9c4d0;margin-top:2px">${esc(d.barrio)}</div></td></tr></table></td></tr>
<tr><td style="background:#ff5a3c;height:5px;line-height:5px;font-size:0">&nbsp;</td></tr>
<tr><td style="background:#ffffff;padding:24px">
<div style="font-size:20px;font-weight:800;color:#101820;margin-bottom:14px">${esc(d.titulo)}</div>
${filas ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #dde1e6;border-bottom:1px solid #dde1e6;margin-bottom:16px">${filas}</table>` : ""}
<p style="font-size:15px;color:#101820;line-height:1.5;margin:0 0 20px">${esc(d.mensaje)}</p>
${d.codigo ? `<div style="background:#f4f5f7;border-radius:14px;padding:16px;text-align:center;font-size:34px;font-weight:800;letter-spacing:10px;color:#101820;font-family:Consolas,Menlo,monospace">${esc(d.codigo)}</div>` : ""}
${d.boton ? `<a href="${esc(d.boton.url)}" style="display:inline-block;background:#ff5a3c;color:#101820;font-weight:800;text-decoration:none;padding:13px 22px;border-radius:14px;font-size:15px">${esc(d.boton.texto)}</a>` : ""}
</td></tr>
<tr><td style="background:#e9ecf0;border-radius:0 0 18px 18px;padding:16px 24px;font-size:12px;color:#5b6672;line-height:1.6">
Enviado desde Missionary Lunch · <a href="${esc(process.env.NEXT_PUBLIC_SITE_URL || "")}" style="color:#1c4f7a">${esc((process.env.NEXT_PUBLIC_SITE_URL || "").replace(/^https?:\/\//, ""))}</a><br>
Desarrollado por <a href="https://www.teolabs.app" style="text-decoration:none">${teoLabsDegradado()}</a> ®
</td></tr></table></td></tr></table></body></html>`;

  await transporte().sendMail({
    from: process.env.SMTP_FROM || `"Missionary Lunch" <${smtp().user}>`,
    to: d.para,
    subject: d.asunto,
    html,
    text: `${d.titulo}\n${d.barrio}\n\n${d.resumen.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${d.mensaje}\n\n${d.codigo ? `${d.codigo}\n\n` : ""}${d.boton ? `${d.boton.texto}: ${d.boton.url}\n\n` : ""}Desarrollado por Teo Labs ® — https://www.teolabs.app`,
  });
}
