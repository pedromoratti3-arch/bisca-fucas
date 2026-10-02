import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade - Bisca Fucas",
  description: "Como o Bisca Fucas trata os dados dos jogadores.",
};

const CONTACT_EMAIL = "pedromoratti3@gmail.com";
const UPDATED_AT = "1 de outubro de 2026";

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(160deg,#0a0a12,#1a0a14,#0a0a12)",
  color: "rgba(236,228,218,.85)",
  fontFamily: "system-ui,sans-serif",
  padding: "40px 16px 60px",
};
const wrap: React.CSSProperties = { maxWidth: 720, margin: "0 auto", lineHeight: 1.65, fontSize: 15 };
const h1: React.CSSProperties = { fontSize: 28, fontWeight: 900, color: "#f0d078", margin: "0 0 4px" };
const h2: React.CSSProperties = { fontSize: 17, fontWeight: 800, color: "#f0d078", margin: "28px 0 8px" };
const link: React.CSSProperties = { color: "#93c5fd" };

export default function PrivacyPage() {
  return (
    <main style={page}>
      <div style={wrap}>
        <Link href="/" style={link}>
          ← Voltar ao jogo
        </Link>
        <h1 style={{ ...h1, marginTop: 20 }}>Política de Privacidade</h1>
        <div style={{ fontSize: 13, opacity: 0.6 }}>Última atualização: {UPDATED_AT}</div>

        <p style={{ marginTop: 20 }}>
          O Bisca Fucas é um jogo de cartas online gratuito. Esta página explica quais dados coletamos, para que
          servem e como você pode pedir que sejam apagados.
        </p>

        <h2 style={h2}>1. Dados que coletamos</h2>
        <p>
          <strong>Se você entra com Google:</strong> recebemos do Google o seu identificador de conta, nome, endereço
          de e-mail e foto de perfil. Não recebemos sua senha nem acesso a nenhum outro dado da sua conta Google.
          Também guardamos o nome no jogo que você escolher e, se você enviar ou tirar uma, a sua foto de perfil
          (reduzida para 256×256 pixels). O nome e a foto ficam visíveis para os outros jogadores das salas em que
          você entrar; o e-mail não é mostrado a ninguém.
        </p>
        <p>
          <strong>Se você joga como convidado:</strong> guardamos apenas o apelido que você digitar, junto com a sala
          em que está jogando.
        </p>
        <p>
          <strong>Durante as partidas:</strong> o estado do jogo (cartas, pontuação, mensagens do chat da sala) e
          sinais de presença online, para mostrar quem está conectado.
        </p>

        <h2 style={h2}>2. Para que usamos</h2>
        <ul>
          <li>Identificar você nas partidas e mostrar seu nome e foto aos outros jogadores da sala.</li>
          <li>Manter você conectado entre visitas (cookie de sessão).</li>
          <li>Permitir que você volte a uma partida se a conexão cair.</li>
        </ul>
        <p>Não vendemos, não alugamos e não usamos seus dados para publicidade.</p>

        <h2 style={h2}>3. Onde ficam guardados</h2>
        <p>
          Os dados são guardados no Firebase (Google Cloud), e o site é hospedado na Vercel. Esses serviços atuam
          apenas como fornecedores de infraestrutura. Os dados das salas são temporários e apagados quando a sala
          termina ou fica abandonada. O cadastro de quem entra com Google fica guardado até você pedir a exclusão.
        </p>

        <h2 style={h2}>4. Cookies e armazenamento no navegador</h2>
        <p>
          Usamos um cookie de sessão (<code>bf_session</code>, válido por 30 dias) apenas para manter seu login, e o
          armazenamento local do navegador para lembrar a sala atual e suas preferências de jogo. Não usamos cookies
          de rastreamento ou de anúncios.
        </p>

        <h2 style={h2}>5. Seus direitos</h2>
        <p>
          Você pode sair da sua conta a qualquer momento pelo botão &quot;Sair&quot;. Para pedir acesso, correção ou
          exclusão dos seus dados, envie um e-mail para{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={link}>
            {CONTACT_EMAIL}
          </a>
          . Você também pode remover o acesso do Bisca Fucas à sua conta Google em{" "}
          <a href="https://myaccount.google.com/connections" style={link} target="_blank" rel="noreferrer">
            myaccount.google.com/connections
          </a>
          .
        </p>

        <h2 style={h2}>6. Menores de idade</h2>
        <p>
          O jogo não é direcionado a crianças menores de 13 anos e não coletamos intencionalmente dados delas.
        </p>

        <h2 style={h2}>7. Alterações</h2>
        <p>
          Podemos atualizar esta política. A data no topo da página indica a última alteração.
        </p>

        <h2 style={h2}>8. Contato</h2>
        <p>
          Dúvidas:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={link}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </main>
  );
}
