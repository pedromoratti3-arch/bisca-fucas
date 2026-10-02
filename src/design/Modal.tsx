"use client";
/**
 * Modal: no celular sobe como "folha" de baixo; no notebook aparece centrado.
 * Fecha com Esc, toque no fundo ou botão X. Anima a saída antes de desmontar.
 * Uso:
 *   <Modal open={open} onClose={() => setOpen(false)} title="Sair da mesa?"
 *          actions={<><Button onClick=...>Cancelar</Button><Button variant="danger">Sair</Button></>}>
 *     Texto do corpo
 *   </Modal>
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { DUR, prefersReducedMotion } from "./motion";

/** Quantos modais estão abertos: só o último a fechar libera a rolagem e o fundo animado. */
let openCount = 0;
function lockPage() {
  openCount++;
  document.documentElement.classList.add("bf-lock");
  document.documentElement.setAttribute("data-bf-paused", "1");
}
function unlockPage() {
  openCount = Math.max(0, openCount - 1);
  if (openCount === 0) {
    document.documentElement.classList.remove("bf-lock");
    document.documentElement.removeAttribute("data-bf-paused");
  }
}

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /** Centrado também no celular (confirmações curtas). */
  center?: boolean;
  wide?: boolean;
  /** Não fecha ao tocar fora / Esc (ex.: tela obrigatória). */
  locked?: boolean;
  hideClose?: boolean;
};

export function Modal(props: ModalProps) {
  const { open, onClose, locked } = props;
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Montar ao abrir; ao fechar, tocar a animação de saída e só então desmontar.
  useEffect(() => {
    if (open) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setClosing(false);
      setMounted(true);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, prefersReducedMotion() ? 0 : DUR.md);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Esc fecha; trava o scroll da página enquanto aberto.
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !locked) onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    lockPage();
    // foco inicial no painel (acessibilidade)
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockPage();
    };
  }, [mounted, locked]);

  if (!mounted) return null;

  const backdropCls = ["bf-backdrop", props.center ? "bf-backdrop--center" : "", closing ? "is-closing" : ""].filter(Boolean).join(" ");
  const modalCls = ["bf-modal", props.wide ? "bf-modal--wide" : ""].filter(Boolean).join(" ");

  return (
    <div
      className={backdropCls}
      onMouseDown={(e) => {
        if (locked) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} className={modalCls} role="dialog" aria-modal="true" tabIndex={-1} style={{ outline: "none" }}>
        <div className="bf-modal__grip" aria-hidden />
        {props.title || !props.hideClose ? (
          <div className="bf-modal__head">
            <div className="bf-modal__title">{props.title}</div>
            {!props.hideClose && !locked ? <Button variant="ghost" size="sm" icon="x" iconOnly aria-label="Fechar" onClick={onClose} /> : null}
          </div>
        ) : null}
        <div className="bf-modal__body">{props.children}</div>
        {props.actions ? <div className="bf-modal__actions">{props.actions}</div> : null}
      </div>
    </div>
  );
}
