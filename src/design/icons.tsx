/**
 * Ícones do jogo: SVG de traço, 24x24, herdam a cor do texto (currentColor).
 * Mesmo estilo dos ícones que já existiam (robô, pessoas, engrenagem).
 * Uso: <Icon name="trophy" size={20} />
 */
import type { CSSProperties } from "react";

export type IconName =
  | "play" | "robot" | "people" | "gear" | "trophy" | "crown" | "shield" | "star" | "cards" | "deck"
  | "bolt" | "book" | "brain" | "calculator" | "sword" | "chess" | "clover" | "target" | "lock" | "unlock"
  | "check" | "x" | "arrow-left" | "chevron-right" | "chevron-down" | "user" | "flag" | "home" | "medal"
  | "gift" | "clock" | "share" | "copy" | "chat" | "camera" | "image" | "logout" | "info" | "plus" | "minus"
  | "spark" | "fire" | "refresh" | "search";

const PATHS: Record<IconName, React.ReactNode> = {
  play: <path d="M8 5.5v13l10-6.5-10-6.5z" fill="currentColor" stroke="none" />,
  robot: (
    <>
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <path d="M12 8V4M9 4h6" />
      <circle cx="9" cy="13.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13.5" r="1.3" fill="currentColor" stroke="none" />
      <path d="M9.5 17h5" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="16.5" cy="9" r="2.6" />
      <path d="M15.5 14c2.8.2 5 2.1 5 4.8" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" />
      <path d="M12 13v3M9 20h6M10 16h4v4h-4z" />
    </>
  ),
  crown: (
    <>
      <path d="M4 17l-1.5-9 5 3.5L12 5l4.5 6.5 5-3.5L20 17H4z" />
      <path d="M4 20h16" />
    </>
  ),
  shield: <path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z" />,
  star: <path d="M12 3.5l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 17l-5.3 2.8 1.1-5.9L3.4 9.8l6-.8L12 3.5z" />,
  cards: (
    <>
      <rect x="3" y="6" width="11" height="15" rx="2" transform="rotate(-8 8.5 13.5)" />
      <rect x="10" y="4" width="11" height="15" rx="2" transform="rotate(8 15.5 11.5)" />
    </>
  ),
  deck: (
    <>
      <rect x="5" y="7" width="12" height="15" rx="2" />
      <path d="M8 4h11a2 2 0 0 1 2 2v12" />
    </>
  ),
  bolt: <path d="M13 2L5 13.5h6L10 22l9-11.5h-6L13 2z" />,
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5z" />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
      <path d="M9 7h7M9 10.5h5" />
    </>
  ),
  brain: (
    <>
      <path d="M9.5 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 1.5 5.2A3 3 0 0 0 11 19V6a2 2 0 0 0-1.5-2z" />
      <path d="M14.5 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-1.5 5.2A3 3 0 0 1 13 19V6a2 2 0 0 1 1.5-2z" />
      <path d="M11 10H8.5M13 10h2.5M11 14H8M13 14h3" />
    </>
  ),
  calculator: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <rect x="8" y="6" width="8" height="3.5" rx=".8" />
      <path d="M8.5 13.5h.01M12 13.5h.01M15.5 13.5h.01M8.5 17h.01M12 17h.01M15.5 17h.01" strokeWidth="2.6" />
    </>
  ),
  sword: (
    <>
      <path d="M14.5 4.5L20 3l-1.5 5.5L8 19l-3-3L14.5 4.5z" />
      <path d="M6.5 14.5l3 3M4 20l1.5-1.5" />
    </>
  ),
  chess: (
    <>
      <path d="M9 20h6l-1-5h-4l-1 5z" />
      <path d="M8 21h8" />
      <path d="M12 3c-2.5 0-4 2-4 4 0 1.6.9 2.6 2 3.4V15h4v-4.6c1.1-.8 2-1.8 2-3.4 0-2-1.5-4-4-4z" />
    </>
  ),
  clover: (
    <>
      <path d="M12 12c-1-3.5-5.5-3.8-5.5-1 0 2.6 4 2.4 5.5 1z" />
      <path d="M12 12c1-3.5 5.5-3.8 5.5-1 0 2.6-4 2.4-5.5 1z" />
      <path d="M12 12c-3.5-1-3.8-5.5-1-5.5 2.6 0 2.4 4 1 5.5z" />
      <path d="M12 12c3.5-1 3.8-5.5 1-5.5-2.6 0-2.4 4-1 5.5z" />
      <path d="M12 12c-3.5 1-3.8 5.5-1 5.5 2.6 0 2.4-4 1-5.5z" />
      <path d="M12 12c3.5 1 3.8 5.5 1 5.5-2.6 0-2.4-4-1-5.5z" />
      <path d="M12 13v8" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 7.6-1.7" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  "chevron-right": <path d="M9.5 6l6 6-6 6" />,
  "chevron-down": <path d="M6 9.5l6 6 6-6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
    </>
  ),
  flag: <path d="M5 21V4m0 0h11l-2 4 2 4H5" />,
  home: (
    <>
      <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-9z" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="14.5" r="5.5" />
      <path d="M8.5 9.5L6 3h4l2 4.5L14 3h4l-2.5 6.5" />
      <path d="M12 12l.8 1.7 1.8.2-1.3 1.2.3 1.9-1.6-.9-1.6.9.3-1.9-1.3-1.2 1.8-.2L12 12z" fill="currentColor" stroke="none" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="10" width="16" height="10" rx="1.5" />
      <path d="M3 7h18v3H3zM12 7v13" />
      <path d="M12 7c-1.5-3-5-3.5-5-1.5S10.5 7 12 7zm0 0c1.5-3 5-3.5 5-1.5S13.5 7 12 7z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </>
  ),
  chat: <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4A2.5 2.5 0 0 1 4 14.5v-8z" />,
  camera: (
    <>
      <path d="M4 8h3l1.6-2.4A1.5 1.5 0 0 1 9.9 5h4.2a1.5 1.5 0 0 1 1.3.6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M21 16l-5-5-8 9" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 8l5 4-5 4M20 12H9" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 7.8h.01" strokeWidth="2.4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />,
  fire: <path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.5.5-2.5 1-3.5.5 1 1.2 1.5 2 1.5 0-2.5-.5-4.5 1-6.5z" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
};

export function Icon(props: { name: IconName; size?: number; strokeWidth?: number; style?: CSSProperties; className?: string; title?: string }) {
  const s = props.size ?? 24;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={props.strokeWidth ?? 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props.title ? undefined : true}
      role={props.title ? "img" : undefined}
      className={props.className}
      style={{ display: "block", flexShrink: 0, ...props.style }}
    >
      {props.title ? <title>{props.title}</title> : null}
      {PATHS[props.name]}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS) as IconName[];

/** Ícone de cada atributo da Tabela de Atributos (Fase 5). */
export const ATTRIBUTE_ICONS = {
  LEI: "book",
  MEM: "brain",
  CON: "calculator",
  TRU: "sword",
  DEC: "chess",
  CLU: "bolt",
  SOR: "clover",
} as const satisfies Record<string, IconName>;
