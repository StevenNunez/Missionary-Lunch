import type { ReactNode } from "react";

function Svg({ size = 18, width = 2, children, className }: { size?: number; width?: number; children: ReactNode; className?: string }) {
  return (
    <svg
      className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type P = { size?: number };

export const Casa = ({ size = 26 }: P) => (
  <Svg size={size}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></Svg>
);
export const Retiro = ({ size = 26 }: P) => (
  <Svg size={size}><path d="M6 8h12l-1 12H7z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Svg>
);
export const Entrega = ({ size = 26 }: P) => (
  <Svg size={size}><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></Svg>
);
export const Reloj = ({ size = 18 }: P) => (
  <Svg size={size}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
);
export const Pin = ({ size = 18 }: P) => (
  <Svg size={size}><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></Svg>
);
export const Usuario = ({ size = 18 }: P) => (
  <Svg size={size}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></Svg>
);
export const Nota = ({ size = 18 }: P) => (
  <Svg size={size}><path d="M5 4h14v16H5z" /><path d="M9 9h6M9 13h6" /></Svg>
);
export const Telefono = ({ size = 18 }: P) => (
  <Svg size={size}><path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" /></Svg>
);
export const Chat = ({ size = 18 }: P) => (
  <Svg size={size}><path d="M4 20l1.5-4A8 8 0 1 1 9 19.5z" /></Svg>
);
export const Izquierda = ({ size = 18 }: P) => (
  <Svg size={size} width={2.5}><path d="M15 6l-6 6 6 6" /></Svg>
);
export const Derecha = ({ size = 18 }: P) => (
  <Svg size={size} width={2.5}><path d="M9 6l6 6-6 6" /></Svg>
);
export const Chevron = ({ size = 18 }: P) => (
  <Svg size={size} width={2.5} className="chev"><path d="M6 9l6 6 6-6" /></Svg>
);
export const TabCalendario = () => (
  <Svg size={22}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>
);
export const TabMisioneros = () => (
  <Svg size={22}><circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><path d="M2 20c0-3 3-5 6-5s6 2 6 5M12 20c0-3 3-5 6-5 2 0 4 1 4 3" /></Svg>
);
export const TabEncargado = () => (
  <Svg size={22}><path d="M9 11l3 3 8-8" /><path d="M20 12v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h9" /></Svg>
);

export const IconoModo = { casa: Casa, retiro: Retiro, entrega: Entrega } as const;
