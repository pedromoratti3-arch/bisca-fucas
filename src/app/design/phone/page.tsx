import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design System (celular) - Bisca Fucas",
  robots: { index: false },
};

/** Mostra qualquer tela do jogo dentro de uma moldura de celular (390×844), para conferir no notebook. Use ?p=/caminho */
export default async function PhonePreviewPage(props: { searchParams: Promise<{ p?: string; z?: string }> }) {
  const sp = await props.searchParams;
  const path = sp.p && sp.p.startsWith("/") ? sp.p : "/design";
  const zoom = sp.z ? Math.max(0.3, Math.min(1, Number(sp.z) || 1)) : 1;
  return (
    <main style={{ minHeight: "100vh", background: "#05050a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, gap: 24, flexWrap: "wrap" }}>
      <div style={{ width: 390 + 24, height: 844 + 24, borderRadius: 48, background: "#111", padding: 12, boxShadow: "0 30px 80px rgba(0,0,0,.7), inset 0 0 0 2px #2a2a33", zoom }}>
        <iframe title="Prévia no celular" src={path} style={{ width: 390, height: 844, border: 0, borderRadius: 38, background: "#0a0a12" }} />
      </div>
      <div style={{ color: "rgba(255,255,255,.6)", fontFamily: "system-ui", fontSize: 13, maxWidth: 260, lineHeight: 1.5 }}>
        Prévia em tamanho de celular (390×844).
        <br />
        Troque a tela com <code>?p=/caminho</code>.
      </div>
    </main>
  );
}
