/**
 * Ícones da barra de navegação: com volume (preenchimento em gradiente, contorno escuro e brilho),
 * no estilo dos jogos mobile. Desenho próprio. Tamanho padrão 28.
 */
import { useId } from "react";

export type NavIconName = "deck" | "missions" | "play" | "clan" | "ranking";

function Defs(props: { id: string; a: string; b: string }) {
  return (
    <defs>
      <linearGradient id={props.id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={props.a} />
        <stop offset="1" stopColor={props.b} />
      </linearGradient>
    </defs>
  );
}

export function NavIcon(props: { name: NavIconName; size?: number; active?: boolean }) {
  const s = props.size ?? 28;
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const outline = "#15161c";
  const sw = 1.6;
  switch (props.name) {
    case "deck":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden>
          <Defs id={id} a="#ffe08a" b="#c48a16" />
          <rect x="9" y="4" width="15" height="21" rx="2.5" fill="#7b1010" stroke={outline} strokeWidth={sw} transform="rotate(10 16.5 14.5)" />
          <rect x="5" y="7" width="15" height="21" rx="2.5" fill="#fff6e6" stroke={outline} strokeWidth={sw} transform="rotate(-6 12.5 17.5)" />
          <path d="M12 12.5c-1.6 0-2.6 1.2-2.6 2.5 0 2.4 3.2 4.6 4.2 5.3 1-.7 4.2-2.9 4.2-5.3 0-1.3-1-2.5-2.6-2.5-.7 0-1.3.3-1.6.8-.3-.5-.9-.8-1.6-.8z" fill="#d8232f" transform="rotate(-6 12.5 17.5)" />
          <rect x="5" y="7" width="15" height="4" rx="2" fill={`url(#${id})`} opacity=".0" />
        </svg>
      );
    case "missions":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden>
          <Defs id={id} a="#c4b5fd" b="#6d28d9" />
          <circle cx="16" cy="16" r="12" fill={`url(#${id})`} stroke={outline} strokeWidth={sw} />
          <circle cx="16" cy="16" r="8" fill="#fff6e6" stroke={outline} strokeWidth={sw} />
          <circle cx="16" cy="16" r="4" fill="#d8232f" stroke={outline} strokeWidth={sw} />
          <path d="M16 16l7-7" stroke="#ffe08a" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M23 9l3-1-1 3" fill="#ffe08a" stroke={outline} strokeWidth="1" strokeLinejoin="round" />
          <ellipse cx="12" cy="9" rx="4" ry="1.6" fill="#fff" opacity=".35" />
        </svg>
      );
    case "play":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden>
          <Defs id={id} a="#fff6e6" b="#e9dcc4" />
          <rect x="4" y="7" width="13" height="19" rx="2.5" fill={`url(#${id})`} stroke={outline} strokeWidth={sw} transform="rotate(-18 10.5 16.5)" />
          <path d="M10.5 12.5l1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="#15161c" transform="rotate(-18 10.5 16.5)" />
          <rect x="15" y="7" width="13" height="19" rx="2.5" fill={`url(#${id})`} stroke={outline} strokeWidth={sw} transform="rotate(18 21.5 16.5)" />
          <path d="M21.5 12c-1.4 0-2.3 1-2.3 2.2 0 2.1 2.8 4 3.7 4.7.9-.7 3.7-2.6 3.7-4.7 0-1.2-.9-2.2-2.3-2.2-.6 0-1.1.3-1.4.7-.3-.4-.8-.7-1.4-.7z" fill="#d8232f" transform="rotate(18 21.5 16.5)" />
        </svg>
      );
    case "clan":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden>
          <Defs id={id} a="#f87171" b="#8a0e22" />
          <path d="M16 3l11 4v9c0 7-4.8 11.8-11 13.5C9.8 27.8 5 23 5 16V7z" fill={`url(#${id})`} stroke={outline} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M16 7l7 2.6v6.6c0 4.6-3 7.9-7 9.2-4-1.3-7-4.6-7-9.2V9.6z" fill="none" stroke="#ffe08a" strokeOpacity=".6" strokeWidth="1.2" />
          <path d="M11.5 16.5l3 3 6-7" fill="none" stroke="#fff6e6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="13" cy="8.5" rx="4" ry="1.4" fill="#fff" opacity=".3" />
        </svg>
      );
    case "ranking":
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden>
          <Defs id={id} a="#ffe08a" b="#c48a16" />
          <path d="M10 4h12v7a6 6 0 0 1-12 0z" fill={`url(#${id})`} stroke={outline} strokeWidth={sw} />
          <path d="M10 6H6.5a3.5 3.5 0 0 0 3.5 5M22 6h3.5a3.5 3.5 0 0 1-3.5 5" fill="none" stroke={outline} strokeWidth={sw} />
          <path d="M14 17h4v4h-4z" fill="#c48a16" stroke={outline} strokeWidth={sw} />
          <rect x="9" y="21" width="14" height="5" rx="1.5" fill="#7b1010" stroke={outline} strokeWidth={sw} />
          <ellipse cx="13.5" cy="7" rx="2" ry="1.2" fill="#fff" opacity=".45" />
        </svg>
      );
  }
}
