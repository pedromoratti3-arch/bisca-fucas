"use client";
import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "@/lib/googleAuth";

/** Lado da foto salva (px). Pequena para caber no banco e carregar rápido. */
const AVATAR_SIZE = 256;
const NICK_MAX = 16;

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(160deg,#0a0a12,#1a0a14,#0a0a12)",
  color: "white",
  fontFamily: "system-ui,sans-serif",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "max(20px, env(safe-area-inset-top)) 16px 40px",
  boxSizing: "border-box",
};
const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 360,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};
const input: React.CSSProperties = {
  background: "rgba(255,255,255,.08)",
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: 10,
  padding: "12px 16px",
  color: "#fff",
  fontSize: 16,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const btn: React.CSSProperties = {
  background: "rgba(255,255,255,.08)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,.2)",
  borderRadius: 10,
  padding: "11px 14px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
};
const primary: React.CSSProperties = {
  ...btn,
  background: "linear-gradient(135deg,#2a6a3a,#1a4a2a)",
  border: "none",
};
const label: React.CSSProperties = { fontSize: 12, opacity: 0.55, textTransform: "uppercase", letterSpacing: 1.5 };
const errStyle: React.CSSProperties = { color: "#ff6b6b", fontSize: 13, textAlign: "center" };

export function Avatar(props: { src?: string; name?: string; size: number }) {
  const [broken, setBroken] = useState(false);
  const s = props.size;
  if (props.src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={props.src}
        alt=""
        width={s}
        height={s}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        style={{ width: s, height: s, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: s,
        height: s,
        borderRadius: "50%",
        background: "#2a6a3a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: s * 0.42,
        flexShrink: 0,
      }}
    >
      {String(props.name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

/** Corta o centro em quadrado e reduz para AVATAR_SIZE, devolvendo JPEG em data URL. */
function squareJpeg(source: CanvasImageSource, w: number, h: number): string {
  const side = Math.min(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function fileToSquareJpeg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        resolve(squareJpeg(img, img.naturalWidth, img.naturalHeight));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir essa imagem"));
    };
    img.src = url;
  });
}

async function postJson(url: string, method: string, body?: unknown) {
  const r = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => null);
  return { ok: r.ok, data: j as { user?: AuthUser; error?: string } | null };
}

function formatWait(ms: number): string {
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days > 1) return `${days} dias`;
  const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
  return hours > 1 ? `${hours} horas` : "1 hora";
}

/** Câmera ao vivo (getUserMedia). Devolve a foto já cortada via onCapture. */
function CameraModal(props: { onCapture: (dataUrl: string) => void; onClose: () => void; onUnavailable: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const unavailableRef = useRef(props.onUnavailable);
  useEffect(() => {
    unavailableRef.current = props.onUnavailable;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      unavailableRef.current();
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      })
      .catch(() => {
        if (!cancelled) unavailableRef.current();
      });
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    props.onCapture(squareJpeg(v, v.videoWidth, v.videoHeight));
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.85)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 16,
      }}
    >
      <div style={{ width: "min(80vw, 320px)", aspectRatio: "1", borderRadius: "50%", overflow: "hidden", background: "#111" }}>
        <video
          ref={videoRef}
          playsInline
          muted
          onLoadedData={() => setReady(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
        />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" style={btn} onClick={props.onClose}>
          Cancelar
        </button>
        <button type="button" style={primary} onClick={capture} disabled={!ready}>
          📸 Tirar foto
        </button>
      </div>
    </div>
  );
}

/** Primeira vez após o login: escolher o apelido fixo. */
export function NicknameSetup(props: { user: AuthUser; onUser: (u: AuthUser) => void; onLogout: () => void }) {
  const [nick, setNick] = useState(props.user.googleName.slice(0, NICK_MAX));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true);
    setErr("");
    const r = await postJson("/api/profile/nickname", "POST", { nickname: nick });
    setBusy(false);
    if (r.ok && r.data && r.data.user) props.onUser(r.data.user);
    else setErr((r.data && r.data.error) || "Não foi possível salvar");
  }

  return (
    <div style={{ ...card, alignItems: "stretch" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Avatar src={props.user.picture} name={props.user.googleName} size={72} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, textAlign: "center" }}>Escolha seu nome no jogo</div>
      <div style={{ fontSize: 13, opacity: 0.65, textAlign: "center", lineHeight: 1.45 }}>
        É assim que os outros jogadores vão te ver. Depois de escolher, você só pode trocar a cada 30 dias.
      </div>
      <input
        value={nick}
        maxLength={NICK_MAX}
        onChange={(e) => setNick(e.target.value.replace(/\s+/g, " ").replace(/^\s+/, ""))}
        placeholder="Seu nome no jogo"
        style={{ ...input, fontSize: 17, textAlign: "center" }}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
        }}
      />
      {err ? <div style={errStyle}>{err}</div> : null}
      <button type="button" style={{ ...primary, padding: 14, fontSize: 16 }} onClick={() => void save()} disabled={busy}>
        {busy ? "Salvando…" : "Confirmar nome"}
      </button>
      <button type="button" style={{ ...btn, background: "transparent", border: "none", opacity: 0.6 }} onClick={props.onLogout}>
        Sair
      </button>
    </div>
  );
}

/** Aba da conta: foto, apelido (com tempo de espera para trocar), e-mail e sair. */
export default function ProfileScreen(props: {
  user: AuthUser;
  onUser: (u: AuthUser) => void;
  onBack: () => void;
  onLogout: () => void;
}) {
  const u = props.user;
  const [nick, setNick] = useState(u.nickname || "");
  const [nickBusy, setNickBusy] = useState(false);
  const [nickMsg, setNickMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [camera, setCamera] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const captureRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const waitMs = u.nextNicknameChangeAt ? u.nextNicknameChangeAt - now : 0;
  const nickLocked = waitMs > 0;

  async function saveNick() {
    setNickBusy(true);
    setNickMsg(null);
    const r = await postJson("/api/profile/nickname", "POST", { nickname: nick });
    setNickBusy(false);
    if (r.data && r.data.user) props.onUser(r.data.user);
    if (r.ok) setNickMsg({ ok: true, text: "Nome atualizado!" });
    else setNickMsg({ ok: false, text: (r.data && r.data.error) || "Não foi possível salvar" });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setPhotoErr("");
    try {
      setPreview(await fileToSquareJpeg(f));
    } catch (er) {
      setPhotoErr(er instanceof Error ? er.message : "Não foi possível abrir essa imagem");
    }
  }

  async function savePhoto() {
    if (!preview) return;
    setPhotoBusy(true);
    setPhotoErr("");
    const r = await postJson("/api/profile/avatar", "POST", { image: preview });
    setPhotoBusy(false);
    if (r.ok && r.data && r.data.user) {
      props.onUser(r.data.user);
      setPreview(null);
    } else setPhotoErr((r.data && r.data.error) || "Não foi possível salvar a foto");
  }

  async function resetPhoto() {
    setPhotoBusy(true);
    setPhotoErr("");
    const r = await postJson("/api/profile/avatar", "DELETE");
    setPhotoBusy(false);
    if (r.ok && r.data && r.data.user) props.onUser(r.data.user);
    else setPhotoErr((r.data && r.data.error) || "Não foi possível remover a foto");
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button type="button" style={{ ...btn, padding: "8px 12px" }} onClick={props.onBack}>
            ← Voltar
          </button>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Meu perfil</div>
          <div style={{ width: 80 }} />
        </div>

        {/* Foto */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 8 }}>
          <Avatar src={preview || u.picture} name={u.name} size={120} />
          {preview ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={btn} onClick={() => setPreview(null)} disabled={photoBusy}>
                Cancelar
              </button>
              <button type="button" style={primary} onClick={() => void savePhoto()} disabled={photoBusy}>
                {photoBusy ? "Salvando…" : "Salvar foto"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <button type="button" style={btn} onClick={() => setCamera(true)}>
                📷 Tirar foto
              </button>
              <button type="button" style={btn} onClick={() => galleryRef.current && galleryRef.current.click()}>
                🖼️ Escolher imagem
              </button>
              {u.hasCustomAvatar ? (
                <button type="button" style={btn} onClick={() => void resetPhoto()} disabled={photoBusy}>
                  Usar foto do Google
                </button>
              ) : null}
            </div>
          )}
          {photoErr ? <div style={errStyle}>{photoErr}</div> : null}
          <input ref={galleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void onFile(e)} />
          <input
            ref={captureRef}
            type="file"
            accept="image/*"
            capture="user"
            style={{ display: "none" }}
            onChange={(e) => void onFile(e)}
          />
        </div>

        {/* Apelido */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          <div style={label}>Nome no jogo</div>
          <input
            value={nick}
            maxLength={NICK_MAX}
            disabled={nickLocked}
            onChange={(e) => {
              setNick(e.target.value.replace(/\s+/g, " ").replace(/^\s+/, ""));
              setNickMsg(null);
            }}
            style={{ ...input, opacity: nickLocked ? 0.6 : 1 }}
          />
          {nickLocked ? (
            <div style={{ fontSize: 12, color: "rgba(212,168,67,.8)" }}>
              Você poderá trocar o nome em {formatWait(waitMs)}.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, opacity: 0.5 }}>Depois de trocar, só poderá mudar de novo em 30 dias.</div>
              <button
                type="button"
                style={primary}
                onClick={() => void saveNick()}
                disabled={nickBusy || nick.trim() === (u.nickname || "")}
              >
                {nickBusy ? "Salvando…" : "Salvar nome"}
              </button>
            </>
          )}
          {nickMsg ? <div style={{ ...errStyle, color: nickMsg.ok ? "#4ade80" : "#ff6b6b" }}>{nickMsg.text}</div> : null}
        </div>

        {/* Conta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          <div style={label}>Conta Google</div>
          <div style={{ fontSize: 14, opacity: 0.8, wordBreak: "break-all" }}>{u.email}</div>
        </div>

        <button type="button" style={{ ...btn, marginTop: 14, color: "#fca5a5" }} onClick={props.onLogout}>
          Sair da conta
        </button>
        <a href="/privacidade" style={{ fontSize: 12, color: "#93c5fd", textAlign: "center", opacity: 0.7 }}>
          Política de Privacidade
        </a>
      </div>

      {camera ? (
        <CameraModal
          onClose={() => setCamera(false)}
          onCapture={(d) => {
            setCamera(false);
            setPreview(d);
          }}
          onUnavailable={() => {
            // Sem câmera ao vivo (ou permissão negada): abre o seletor nativo, que no celular oferece a câmera.
            setCamera(false);
            setPhotoErr('Não foi possível abrir a câmera. Use "Escolher imagem" (no celular dá para escolher Câmera).');
            if (captureRef.current) captureRef.current.click();
          }}
        />
      ) : null}
    </div>
  );
}
