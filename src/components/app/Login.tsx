"use client";

import { useState } from "react";
import { obtenerRepo } from "@/lib/repo";
import { guardar, leer, mensajeDe } from "@/lib/util";

/**
 * Acceso sin contraseña. Por defecto, nombre y número de WhatsApp (como la hoja de papel);
 * el encargado y los misioneros entran con correo y código de 6 dígitos.
 */
export default function Login({ alEntrar }: { alEntrar: () => void }) {
  const [modo, setModo] = useState<"whatsapp" | "correo">("whatsapp");
  const [nombre, setNombre] = useState(() => leer("am_nombre") ?? "");
  const [telefono, setTelefono] = useState(() => leer("am_tel") ?? "");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function entrarWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setError("");
    try {
      const tel = await obtenerRepo().entrarConTelefono(nombre.trim(), telefono.trim());
      guardar("am_nombre", nombre.trim());
      guardar("am_tel", tel);
      alEntrar();
    } catch (err) {
      setError(mensajeDe(err, "No se pudo entrar. Intenta de nuevo."));
    }
    setOcupado(false);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setError("");
    try {
      await obtenerRepo().enviarCodigo(email.trim());
      setEnviado(true);
    } catch (err) {
      setError(mensajeDe(err, "No se pudo enviar el código. Revisa el correo e intenta de nuevo."));
    }
    setOcupado(false);
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setError("");
    try {
      await obtenerRepo().verificarCodigo(email.trim(), codigo);
      alEntrar();
    } catch {
      setError("El código no es válido o venció. Pide uno nuevo.");
    }
    setOcupado(false);
  }

  if (modo === "whatsapp") {
    return (
      <form className="card" style={{ display: "grid", gap: 14 }} onSubmit={entrarWhatsapp}>
        <span className="h2">Entra con tu WhatsApp</span>
        <p className="muted" style={{ margin: 0 }}>Escribe tu nombre y tu número, como en la hoja. Sin claves ni códigos.</p>
        <label>
          Tu nombre
          <input required autoComplete="name" value={nombre} maxLength={60}
            onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: María Rojas" />
        </label>
        <label>
          Tu número de WhatsApp
          <input type="tel" required autoComplete="tel" inputMode="tel" value={telefono} maxLength={30}
            onChange={(e) => setTelefono(e.target.value)} placeholder="9 1234 5678" />
        </label>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Si no es de Chile, empieza con + y el código de tu país.</p>
        {error && <span className="error" role="alert">{error}</span>}
        <button className="btn block" type="submit" disabled={ocupado}>{ocupado ? "Entrando…" : "Entrar"}</button>
        <button type="button" className="link-btn" onClick={() => { setModo("correo"); setError(""); }}>
          Soy encargado o misionero: entrar con correo
        </button>
      </form>
    );
  }

  if (!enviado) {
    return (
      <form className="card" style={{ display: "grid", gap: 14 }} onSubmit={enviar}>
        <span className="h2">Ingresa con tu correo</span>
        <p className="muted" style={{ margin: 0 }}>Sin contraseñas: te enviamos un código para entrar.</p>
        <label>
          Correo electrónico
          <input type="email" required autoComplete="email" inputMode="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
        </label>
        {error && <span className="error" role="alert">{error}</span>}
        <button className="btn block" type="submit" disabled={ocupado}>{ocupado ? "Enviando…" : "Enviarme el código"}</button>
        <button type="button" className="link-btn" onClick={() => { setModo("whatsapp"); setError(""); }}>
          Volver a entrar con WhatsApp
        </button>
      </form>
    );
  }

  return (
    <form className="card" style={{ display: "grid", gap: 14 }} onSubmit={verificar}>
      <span className="h2">Revisa tu correo</span>
      <p className="muted" style={{ margin: 0 }}>
        Enviamos un código a <b>{email}</b>. Escríbelo aquí, o toca el enlace del correo.
      </p>
      <label>
        Código
        <input className="code-input" inputMode="numeric" autoComplete="one-time-code" required maxLength={8}
          value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} placeholder="••••••" />
      </label>
      {error && <span className="error" role="alert">{error}</span>}
      <button className="btn block" type="submit" disabled={ocupado || codigo.length < 6}>{ocupado ? "Entrando…" : "Entrar"}</button>
      <button type="button" className="link-btn" onClick={() => { setEnviado(false); setCodigo(""); setError(""); }}>
        Usar otro correo
      </button>
    </form>
  );
}
