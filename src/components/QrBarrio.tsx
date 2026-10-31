"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Código QR en SVG (se dibuja en el navegador, nada sale a un servicio externo). */
export default function QrBarrio({ texto, etiqueta, tam = 220 }: { texto: string; etiqueta: string; tam?: number }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let vigente = true;
    QRCode.toString(texto, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#101820", light: "#ffffff" } })
      .then((s) => { if (vigente) setSvg(s); })
      .catch(() => { if (vigente) setSvg(""); });
    return () => { vigente = false; };
  }, [texto]);

  return (
    <div className="qr" role="img" aria-label={etiqueta} style={{ width: tam, height: tam }}
      dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
