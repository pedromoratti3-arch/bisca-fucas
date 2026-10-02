"use client";
/** Configurações: Regras, Jogabilidade (arrastar ou tocar), Sobre. Mesmo conteúdo de antes, nova roupa. */
import { useState } from "react";
import { Panel, Segmented } from "@/design";
import { SectionShell } from "./common";
import { bfSettingsGameplayContent, bfSettingsRulesContent } from "./rulesContent";

const ABOUT = [
  "Apresentamos o Bisca Fucas, um jogo criado para alunos da Fucape — calouros, veteranos e até aqueles que já se formaram, mas continuam conectados à experiência. Mais do que um simples jogo de cartas, ele carrega uma tradição: as regras são exatamente aquelas que os veteranos passaram aos calouros ao longo dos anos, sendo transmitidas de geração em geração dentro da faculdade.",
  "",
  "O Bisca Fucas foi pensado para funcionar em qualquer ambiente: na sala de aula - o real propósito do jogo kkkkkkkk, no campus, em casa ou em encontros com amigos. A proposta é simples, mas consistente: recriar a dinâmica clássica da bisca dentro de um contexto que faz sentido para quem vive ou viveu a Fucape.",
  "",
  "O jogo conta com um modo contra bots, mas é importante deixar claro que eles não foram feitos para substituir a experiência real. Pelo contrário, são intencionalmente limitados, quase como um convite — ou uma leve provocação — para que você jogue com outras pessoas. Porque, na prática, nenhuma inteligência artificial consegue reproduzir o nível de estratégia, imprevisibilidade e, principalmente, as interações que acontecem em uma partida entre amigos.",
  "",
  "aproveitem! by: Ruivo",
].join("\n");

export function SettingsScreen(props: { onBack: () => void; cardInputMode: "drag" | "tap"; onCardInputModeChange: (m: "drag" | "tap") => void; topPad?: number }) {
  const [tab, setTab] = useState<"rules" | "gameplay" | "about">("gameplay");
  const narrow = typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : true;
  return (
    <SectionShell title="Configurações" icon="gear" onBack={props.onBack} wide>
      <div className="bf-stack bf-stack--lg" style={{ paddingTop: props.topPad || 0 }}>
        <Segmented block value={tab} onChange={setTab} options={[{ value: "gameplay", label: "Jogabilidade" }, { value: "rules", label: "Regras" }, { value: "about", label: "Sobre" }]} />
        <Panel pad="lg">
          {tab === "rules" ? bfSettingsRulesContent(narrow) : tab === "gameplay" ? bfSettingsGameplayContent(narrow, props.cardInputMode, (m: string) => props.onCardInputModeChange(m === "tap" ? "tap" : "drag")) : <p className="bf-body" style={{ whiteSpace: "pre-line", color: "var(--bf-text-2)", maxWidth: 720 }}>{ABOUT}</p>}
        </Panel>
        <div className="bf-caption" style={{ textAlign: "center" }}>
          <a href="/privacidade" style={{ color: "var(--bf-info)" }}>Política de Privacidade</a>
        </div>
      </div>
    </SectionShell>
  );
}
