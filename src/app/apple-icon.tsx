import { ImageResponse } from "next/og";
import { iconoPlaca } from "@/lib/iconoPlaca";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(iconoPlaca(180, 0.78), size);
}
