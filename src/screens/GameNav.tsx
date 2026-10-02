"use client";
/**
 * Barra inferior no estilo Clash Royale: 5 botões, o do meio (JOGAR) maior e destacado.
 * Esquerda: Coleção, Missões · Direita: Clã, Ranking. Bolinha vermelha com número nos ícones.
 * No notebook a barra fica centralizada com largura limitada (não estica de ponta a ponta).
 */
import { NavIcon } from "@/design/navIcons";

export type NavSection = "home" | "collection" | "missions" | "clan" | "ranking";

export function GameNav(props: { current: NavSection; badges?: Partial<Record<NavSection, number>>; onSelect: (s: NavSection) => void; onPlay: () => void }) {
  const items: { id: NavSection; label: string; icon: "deck" | "missions" | "clan" | "ranking" }[] = [
    { id: "collection", label: "Coleção", icon: "deck" },
    { id: "missions", label: "Missões", icon: "missions" },
    { id: "clan", label: "Clã", icon: "clan" },
    { id: "ranking", label: "Ranking", icon: "ranking" },
  ];
  const badge = (id: NavSection) => {
    const n = props.badges?.[id] || 0;
    return n ? <span className="bf-badge-count">{n > 99 ? "99+" : n}</span> : null;
  };
  const side = (it: (typeof items)[number]) => {
    const active = props.current === it.id;
    return (
      <button key={it.id} type="button" className={["bf-gnav__item", active ? "is-active" : ""].join(" ")} aria-current={active ? "page" : undefined} onClick={() => props.onSelect(it.id)} aria-label={it.label}>
        <span className="bf-gnav__icon"><NavIcon name={it.icon} size={30} active={active} /></span>
        <span className="bf-gnav__label">{it.label}</span>
        {badge(it.id)}
      </button>
    );
  };
  return (
    <nav className="bf-gnav" aria-label="Navegação principal">
      <div className="bf-gnav__bar">
        {items.slice(0, 2).map(side)}
        <button type="button" className={["bf-gnav__play", props.current === "home" ? "is-active" : ""].join(" ")} onClick={props.onPlay} aria-label="Jogar">
          <span className="bf-gnav__play-icon"><NavIcon name="play" size={34} /></span>
          <span className="bf-gnav__play-label">Jogar</span>
        </button>
        {items.slice(2).map(side)}
      </div>
    </nav>
  );
}
