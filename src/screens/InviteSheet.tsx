"use client";
/** Convidar amigos: compartilha o link do jogo (ou o código da sala) pelo botão nativo de compartilhar, WhatsApp ou copiar. */
import { Button, Icon, Modal } from "@/design";

export function InviteSheet(props: { open: boolean; onClose: () => void; roomCode?: string; onCreateRoom?: () => void; onCopied?: () => void }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  /** Link direto: quem abrir entra na sala sem digitar o código. */
  const url = props.roomCode ? `${origin}/?sala=${props.roomCode}` : origin;
  const text = props.roomCode
    ? `Bora uma bisca? Entra na minha sala do Bisca Fucas (código ${props.roomCode}): ${url}`
    : `Bora uma bisca? Joga comigo no Bisca Fucas: ${url}`;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Bisca Fucas", text, url });
        return;
      }
    } catch {
      /* cancelado */
    }
    await copy();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      props.onCopied?.();
    } catch {
      /* sem permissão */
    }
  }
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <Modal open={props.open} onClose={props.onClose} title="Convidar amigos">
      <div className="bf-stack">
        {props.roomCode ? (
          <div className="bf-panel bf-panel--gold bf-panel--pad" style={{ textAlign: "center" }}>
            <div className="bf-label">Código da sala</div>
            <div className="bf-display bf-gold-text" style={{ letterSpacing: ".3em", marginTop: 4 }}>{props.roomCode}</div>
            <div className="bf-caption" style={{ marginTop: 6 }}>Quem abrir o link entra direto nesta sala.</div>
          </div>
        ) : (
          <p className="bf-body-sm" style={{ color: "var(--bf-text-2)" }}>Mande o link para a galera. Para jogar junto, crie uma sala e compartilhe o código de 4 letras.</p>
        )}
        <Button variant="primary" block icon="share" onClick={() => void share()}>Compartilhar</Button>
        <a className="bf-btn bf-btn--secondary bf-btn--block" href={wa} target="_blank" rel="noreferrer">
          <Icon name="chat" /> WhatsApp
        </a>
        <Button variant="secondary" block icon="copy" onClick={() => void copy()}>Copiar link</Button>
        {!props.roomCode && props.onCreateRoom ? (
          <Button variant="ghost" block icon="people" onClick={props.onCreateRoom}>Criar sala agora</Button>
        ) : null}
      </div>
    </Modal>
  );
}
