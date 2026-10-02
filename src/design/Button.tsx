"use client";
/**
 * Botão padrão do jogo.
 * variant: primary (dourado, ação principal) · accent (roxo) · secondary (vidro) · ghost · danger · outline-danger
 * size: sm · md · lg · block (largura total) · icon (quadrado só com ícone)
 * loading: mostra spinner e bloqueia cliques. pulse: pulsação lenta em repouso (só na ação principal).
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "outline-danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  iconOnly?: boolean;
  loading?: boolean;
  /** Pulsação lenta em repouso: só para a ação principal da tela. */
  pulse?: boolean;
  children?: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  block,
  icon,
  iconRight,
  iconOnly,
  loading,
  pulse,
  className,
  children,
  disabled,
  type,
  ...rest
}: ButtonProps) {
  const cls = [
    "bf-btn",
    `bf-btn--${variant}`,
    size !== "md" ? `bf-btn--${size}` : "",
    block ? "bf-btn--block" : "",
    iconOnly ? "bf-btn--icon" : "",
    loading ? "is-loading" : "",
    pulse ? "is-pulsing" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type || "button"} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {icon ? <Icon name={icon} /> : null}
      {iconOnly ? null : children}
      {iconRight ? <Icon name={iconRight} /> : null}
      {loading ? (
        <span className="bf-btn__spinner" aria-hidden>
          <span className="bf-spinner" />
        </span>
      ) : null}
    </button>
  );
}
