// Service worker de Missionary Lunch.
// - Hace la app instalable y rápida: guarda los archivos estáticos (JS, CSS, íconos).
// - NO guarda datos del barrio: el calendario siempre se lee en vivo.
// - Recibe los avisos push (recordatorio de la noche anterior).
const ESTATICOS = "ml-estaticos-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== ESTATICOS) await caches.delete(k);
      await self.clients.claim();
    })(),
  ),
);

const SIN_CONEXION =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión</title><body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#f4f5f7;color:#101820;text-align:center;padding:24px"><div><h1>Sin conexión</h1><p>Necesitas internet para ver el calendario del barrio. Vuelve a intentarlo en un momento.</p><button onclick="location.reload()" style="font:inherit;font-weight:800;border:0;border-radius:14px;padding:13px 22px;background:#ff5a3c;color:#101820">Reintentar</button></div>';

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => new Response(SIN_CONEXION, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
    );
    return;
  }

  // Archivos estáticos con huella (inmutables) e íconos: del caché primero.
  if (url.origin === location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa/"))) {
    e.respondWith(
      caches.open(ESTATICOS).then(async (c) => {
        const guardado = await c.match(req);
        if (guardado) return guardado;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
  }
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* aviso sin formato */ }
  e.waitUntil(
    self.registration.showNotification(d.titulo || "Missionary Lunch", {
      body: d.cuerpo || "",
      icon: "/pwa/192",
      badge: "/pwa/192",
      tag: d.etiqueta || "ml",
      data: { url: d.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const destino = new URL(e.notification.data?.url || "/", location.origin).href;
  e.waitUntil(
    (async () => {
      const abiertas = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of abiertas) {
        if (new URL(w.url).origin === location.origin) {
          await w.focus();
          if ("navigate" in w) await w.navigate(destino).catch(() => {});
          return;
        }
      }
      await clients.openWindow(destino);
    })(),
  );
});
