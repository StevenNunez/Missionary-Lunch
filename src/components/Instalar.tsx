"use client";

import { useCallback, useEffect, useState } from "react";
import { guardar, leer } from "@/lib/util";

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const OCULTAR_DIAS = 7;
const esIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const base64ABytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const oculto = () => {
  const t = Number(leer("ml_instalar_oculto"));
  return Boolean(t) && Date.now() - t < OCULTAR_DIAS * 86400000;
};

/** Estado de instalación de la app (PWA). */
function useInstalar() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [instalada, setInstalada] = useState(true); // true hasta comprobar: evita parpadeo
  const [ios, setIos] = useState(false);
  const [oculta, setOculta] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalada(standalone);
    setIos(esIphone() && !standalone);
    setOculta(oculto());
    const alPreparar = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar); };
    const alInstalar = () => { setInstalada(true); setEvento(null); };
    window.addEventListener("beforeinstallprompt", alPreparar);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", alPreparar);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") setInstalada(true);
    setEvento(null);
  }, [evento]);
  const ocultar = useCallback(() => { guardar("ml_instalar_oculto", String(Date.now())); setOculta(true); }, []);

  return { instalada, puede: Boolean(evento), ios, oculta, instalar, ocultar };
}

/** Invitación a instalar la app: botón directo en Android y escritorio, pasos en iPhone. */
export function TarjetaInstalar() {
  const { instalada, puede, ios, oculta, instalar, ocultar } = useInstalar();
  if (instalada || oculta || (!puede && !ios)) return null;
  return (
    <div className="card" style={{ display: "grid", gap: 10 }} role="region" aria-label="Instalar la app">
      <span className="h2">Instala la app en tu celular</span>
      {puede ? (
        <p className="muted" style={{ margin: 0 }}>
          Ábrela con un toque desde tu pantalla de inicio, sin buscar el enlace, y recibe el recordatorio del día anterior.
        </p>
      ) : (
        <ol className="muted" style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>
          <li>Abre esta página en <b>Safari</b>.</li>
          <li>Toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li>
          <li>Elige <b>Agregar a pantalla de inicio</b>.</li>
        </ol>
      )}
      <div className="row">
        {puede && <button className="btn" style={{ flex: 1 }} onClick={instalar}>Instalar la app</button>}
        <button className="btn sec" onClick={ocultar}>Ahora no</button>
      </div>
    </div>
  );
}

type EstadoAvisos = "no-disponible" | "necesita-instalar" | "apagados" | "encendidos" | "bloqueados";

/** Avisos push: el recordatorio de la noche anterior llega al celular, aunque no se tenga correo. */
function useAvisos(activo: boolean) {
  const [estado, setEstado] = useState<EstadoAvisos>("no-disponible");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  const leerEstado = useCallback(async () => {
    if (!activo || !CLAVE_PUBLICA || !("serviceWorker" in navigator) || !("Notification" in window)) {
      return setEstado("no-disponible");
    }
    if (!("PushManager" in window)) {
      // iPhone: los avisos solo existen cuando la app está instalada en la pantalla de inicio.
      return setEstado(esIphone() ? "necesita-instalar" : "no-disponible");
    }
    if (Notification.permission === "denied") return setEstado("bloqueados");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setEstado(sub && Notification.permission === "granted" ? "encendidos" : "apagados");
    } catch {
      setEstado("apagados");
    }
  }, [activo]);
  useEffect(() => {
    leerEstado();
    // La tarjeta y el enlace del pie comparten estado: se avisan entre sí.
    window.addEventListener("ml-avisos", leerEstado);
    return () => window.removeEventListener("ml-avisos", leerEstado);
  }, [leerEstado]);

  const encender = useCallback(async () => {
    setOcupado(true);
    setError("");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") return setEstado(permiso === "denied" ? "bloqueados" : "apagados");
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ABytes(CLAVE_PUBLICA!) }));
      const res = await fetch("/api/push", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error();
      setEstado("encendidos");
      window.dispatchEvent(new Event("ml-avisos"));
    } catch {
      setError("No se pudieron activar los avisos. Intenta de nuevo.");
    } finally {
      setOcupado(false);
    }
  }, []);

  const apagar = useCallback(async () => {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", {
          method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setEstado("apagados");
      window.dispatchEvent(new Event("ml-avisos"));
    } finally {
      setOcupado(false);
    }
  }, []);

  return { estado, ocupado, error, encender, apagar };
}

export function TarjetaAvisos({ activo }: { activo: boolean }) {
  const { estado, ocupado, error, encender } = useAvisos(activo);
  if (estado !== "apagados") return null;
  return (
    <div className="card" style={{ display: "grid", gap: 10 }} role="region" aria-label="Avisos">
      <span className="h2">Recibe el recordatorio en tu celular</span>
      <p className="muted" style={{ margin: 0 }}>
        La noche anterior te avisamos para que confirmes el almuerzo, porque los misioneros planifican cada noche. Solo avisos
        del almuerzo, nada más.
      </p>
      {error && <span className="error" role="alert">{error}</span>}
      <button className="btn block" disabled={ocupado} onClick={encender}>Activar avisos</button>
    </div>
  );
}

/** Enlace discreto al pie: apagar los avisos, o ayuda si quedaron bloqueados o falta instalar. */
export function AjusteAvisos({ activo }: { activo: boolean }) {
  const { estado, ocupado, apagar } = useAvisos(activo);
  if (estado === "encendidos") {
    return (
      <button className="link-btn" style={{ justifySelf: "center" }} disabled={ocupado} onClick={apagar}>
        Avisos activados en este celular · Desactivar
      </button>
    );
  }
  if (estado === "necesita-instalar") {
    return <p className="muted" style={{ margin: 0, textAlign: "center", fontSize: 14 }}>Para recibir avisos en iPhone, primero agrega la app a tu pantalla de inicio.</p>;
  }
  if (estado === "bloqueados") {
    return <p className="muted" style={{ margin: 0, textAlign: "center", fontSize: 14 }}>Los avisos están bloqueados. Actívalos en los ajustes de notificaciones de tu navegador.</p>;
  }
  return null;
}
