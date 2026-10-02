"use client";
/**
 * Barra de navegação inferior (celular e notebook): Início · Missões · Ranking · Perfil.
 * Fica ao alcance do polegar. Mostra contador vermelho quando há algo para pegar.
 */
import { Icon, type IconName } from "./icons";
import { CountBadge } from "./Panel";

export type NavItem<T extends string = string> = { id: T; label: string; icon: IconName; badge?: number };

export function BottomNav<T extends string>(props: { items: NavItem<T>[]; current: T; onChange: (id: T) => void }) {
  return (
    <nav className="bf-nav" aria-label="Navegação principal">
      <div className="bf-nav__bar">
        {props.items.map((it) => (
          <button key={it.id} type="button" className="bf-nav__item" aria-current={it.id === props.current ? "page" : undefined} onClick={() => props.onChange(it.id)}>
            <Icon name={it.icon} />
            <span>{it.label}</span>
            <CountBadge count={it.badge || 0} />
          </button>
        ))}
      </div>
    </nav>
  );
}
