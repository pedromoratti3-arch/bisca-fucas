/**
 * Figuras das cartas (Valete, Dama, Rei): desenho próprio, simples e elegante.
 * - Rei: coroa alta com cruz.
 * - Dama: tiara com joia central.
 * - Valete: chapéu com pluma.
 * Herdam a cor da tinta (currentColor); `accent` dá o detalhe dourado/colorido.
 */
export function FaceArt(props: { value: "J" | "Q" | "K"; accent?: string }) {
  const accent = props.accent ?? "#d4a843";
  switch (props.value) {
    case "K":
      return (
        <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
          <path d="M8 36V18l8 7 8-13 8 13 8-7v18z" fill="currentColor" />
          <path d="M8 36h32v5H8z" fill={accent} />
          <circle cx="16" cy="25" r="2.2" fill={accent} />
          <circle cx="24" cy="21" r="2.2" fill={accent} />
          <circle cx="32" cy="25" r="2.2" fill={accent} />
          <path d="M24 6v6M21 9h6" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "Q":
      return (
        <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
          <path d="M6 34c4-8 8-14 18-14s14 6 18 14z" fill="currentColor" />
          <path d="M6 34h36v4H6z" fill={accent} />
          <path d="M24 12l4 7-4 4-4-4z" fill={accent} />
          <circle cx="12" cy="27" r="1.8" fill={accent} />
          <circle cx="36" cy="27" r="1.8" fill={accent} />
          <circle cx="24" cy="30" r="2.4" fill="#fff" opacity=".85" />
        </svg>
      );
    case "J":
    default:
      return (
        <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
          <path d="M10 34c0-10 6-18 14-18s14 8 14 18z" fill="currentColor" />
          <path d="M6 34h36v4H6z" fill={accent} />
          <path d="M28 18c4-8 10-11 15-10-2 5-6 9-13 12" fill={accent} />
          <path d="M30 20c3-5 7-8 11-8" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".5" />
        </svg>
      );
  }
}
