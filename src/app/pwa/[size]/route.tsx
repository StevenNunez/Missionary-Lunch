import { ImageResponse } from "next/og";
import { iconoPlaca } from "@/lib/iconoPlaca";

const TAMANOS = { "192": [192, 0.86], "512": [512, 0.86], "maskable-512": [512, 0.62] } as const;

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  // "maskable": la placa queda dentro de la zona segura (el sistema recorta los bordes).
  const [px, escala] = TAMANOS[size as keyof typeof TAMANOS] ?? TAMANOS["512"];
  return new ImageResponse(iconoPlaca(px, escala), { width: px, height: px });
}
