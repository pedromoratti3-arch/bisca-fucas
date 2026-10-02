"use client";
/**
 * Avisos rápidos (toast). Um "host" fica no canto da tela e enfileira as mensagens.
 * Uso: const toast = useToast();  toast.show({ text: "Missão concluída!", tone: "gold", icon: "trophy" });
 * O <ToastProvider> deve envolver o app (fica no layout da Fase 3).
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { DUR, prefersReducedMotion } from "./motion";

export type ToastTone = "neutral" | "success" | "gold" | "danger" | "accent";
export type ToastInput = { text: ReactNode; tone?: ToastTone; icon?: IconName; durationMs?: number };
type ToastItem = ToastInput & { id: number; leaving?: boolean };

type Ctx = { show: (t: ToastInput) => void };
const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider(props: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((cur) => cur.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), prefersReducedMotion() ? 0 : DUR.sm);
  }, []);

  const show = useCallback(
    (t: ToastInput) => {
      const id = ++seq.current;
      setItems((cur) => [...cur.slice(-2), { ...t, id }]); // no máximo 3 na tela
      setTimeout(() => remove(id), t.durationMs ?? 3200);
    },
    [remove]
  );

  const ctx = useMemo(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={ctx}>
      {props.children}
      <div className="bf-toast-host" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className={["bf-toast", t.tone && t.tone !== "neutral" ? `bf-toast--${t.tone}` : "", t.leaving ? "is-leaving" : ""].filter(Boolean).join(" ")} onClick={() => remove(t.id)}>
            {t.icon ? <Icon name={t.icon} /> : null}
            <div style={{ flex: 1, minWidth: 0 }}>{t.text}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    // Sem provider: não quebra o app, só avisa no console.
    return { show: (t) => console.warn("[toast sem ToastProvider]", t.text) };
  }
  return ctx;
}
