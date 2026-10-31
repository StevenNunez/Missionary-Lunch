import { ImageResponse } from "next/og";
import { iconoPlaca } from "@/lib/iconoPlaca";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(iconoPlaca(64, 0.92, 14), size);
}
