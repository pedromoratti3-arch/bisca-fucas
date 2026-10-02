"use client";
/**
 * Campo de texto, campo com rótulo/dica/erro e controle segmentado (abas pequenas).
 */
import type { InputHTMLAttributes, ReactNode } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { code?: boolean; invalid?: boolean };

export function Input({ code, invalid, className, ...rest }: InputProps) {
  const cls = ["bf-input", code ? "bf-input--code" : "", className || ""].filter(Boolean).join(" ");
  return <input className={cls} aria-invalid={invalid || undefined} {...rest} />;
}

export function Field(props: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="bf-field">
      {props.label ? (
        <label className="bf-label" htmlFor={props.htmlFor}>
          {props.label}
        </label>
      ) : null}
      {props.children}
      {props.error ? (
        <div className="bf-field__error" role="alert">
          {props.error}
        </div>
      ) : props.hint ? (
        <div className="bf-field__hint">{props.hint}</div>
      ) : null}
    </div>
  );
}

export function Segmented<T extends string>(props: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; ariaLabel?: string; block?: boolean }) {
  return (
    <div className="bf-seg" role="tablist" aria-label={props.ariaLabel} style={props.block ? { display: "flex", width: "100%" } : undefined}>
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          className="bf-seg__item"
          aria-selected={o.value === props.value}
          onClick={() => props.onChange(o.value)}
          style={props.block ? { flex: 1 } : undefined}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
