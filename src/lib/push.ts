import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface AvisoPush {
  titulo: string;
  cuerpo: string;
  /** Ruta que se abre al tocar el aviso. */
  url: string;
  /** Avisos con la misma etiqueta se reemplazan entre sí. */
  etiqueta?: string;
}

export const pushConfigurado = () =>
  Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let listo = false;
function preparar() {
  if (listo) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:avisos@teolabs.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  listo = true;
}

/** Manda el aviso a todos los dispositivos de la persona. Devuelve cuántos lo recibieron. */
export async function enviarPush(userId: string, aviso: AvisoPush): Promise<number> {
  if (!pushConfigurado()) return 0;
  preparar();
  const admin = supabaseAdmin();
  const { data } = await admin.from("push_suscripciones").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  let enviados = 0;
  for (const s of data ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(aviso),
        { TTL: 12 * 3600, urgency: "high" },
      );
      enviados++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      // 404/410: el dispositivo ya no existe o revocó el permiso.
      if (code === 404 || code === 410) await admin.from("push_suscripciones").delete().eq("id", s.id);
    }
  }
  return enviados;
}
