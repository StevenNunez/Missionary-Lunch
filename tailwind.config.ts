import type { Config } from "tailwindcss";

// Tailwind solo aporta las utilidades de la firma de Teo Labs; el resto del
// diseño vive en globals.css (tokens del prototipo aprobado).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
export default config;
