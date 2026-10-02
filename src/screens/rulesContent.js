/* eslint-disable no-var */
/** Conteúdo das Configurações (regras e jogabilidade), movido de page.tsx sem alterações de texto. JavaScript simples. */
/** Conteúdo das Configurações (regras e jogabilidade), movido de page.tsx sem alterações de texto. */
import React from "react";

/** Conteúdo rico das regras (tópicos / subtópicos, títulos reforçados). */
export function bfSettingsRulesContent(narrow) {
  var p = {
    fontSize: 15,
    lineHeight: 1.68,
    color: 'rgba(236,228,218,.78)',
    margin: '0 0 11px',
    maxWidth: 720,
    fontWeight: 450,
  };
  var h3 = {
    fontSize: narrow ? 13.5 : 14.5,
    fontWeight: 800,
    letterSpacing: 0.85,
    textTransform: 'uppercase',
    color: '#f0d078',
    margin: '22px 0 10px',
    lineHeight: 1.35,
    textShadow: '0 1px 14px rgba(0,0,0,.35)',
  };
  var h4 = {
    fontSize: 13,
    fontWeight: 700,
    color: 'rgba(255,248,235,.96)',
    margin: '14px 0 7px',
    lineHeight: 1.35,
  };
  var h3First = Object.assign({}, h3, { marginTop: 10 });
  var intro = Object.assign({}, p, {
    marginBottom: 16,
    fontStyle: 'italic',
    color: 'rgba(236,228,218,.88)',
  });
  function P(key, style, children) {
    return React.createElement('p', { key: key, style: style || p }, children);
  }
  function H3(key, text, first) {
    return React.createElement('h3', { key: key, style: first ? h3First : h3 }, text);
  }
  function H4(key, text) {
    return React.createElement('h4', { key: key, style: h4 }, text);
  }

  return React.createElement(
    'div',
    { style: { maxWidth: 720 } },
    P(
      'i',
      intro,
      'Regras que, na Fucape, foram passadas de geração em geração — e que o Bisca Fucas aplica nesta mesa digital.'
    ),
    H3('s1', '1. Duplas e objetivo', true),
    H4('s1a', 'Equipes'),
    P(
      't1a',
      null,
      'São quatro jogadores em duas equipes: você e o seu parceiro ficam frente a frente dos dois adversários.'
    ),
    H4('s1b', 'Objetivo na partida'),
    P(
      't1b',
      null,
      'Ganha quem primeiro chegar a 4 pontos no placar da partida. A cada vez que se distribuem e se jogam as 40 cartas, vê-se quem sobe pontos — depois embaralha-se de novo e segue a mesma ordem.'
    ),
    H3('s2', '2. Começo da partida: embaralhar, cortar, começar'),
    P(
      't2rot',
      null,
      'A regra da mesa é esta: uma pessoa embaralha o baralho, quem está à esquerda de quem embaralha é quem corta, e quem está à direita de quem embaralha é quem começa a jogar. É sempre nessa ordem.'
    ),
    P(
      't2see',
      null,
      'Dá para ver as cartas a serem dadas no início da distribuição e também na última leva, quando as últimas cartas vão para a mão de cada um.'
    ),
    H4('s2a', '2.1 Modo normal — uma carta de cada vez'),
    P(
      't2a',
      null,
      'Depois do corte, o baralho reparte-se em 12 passagens: em cada passagem sai uma carta para o jogador da vez, à roda da mesa. Ficam 3 cartas na mão de cada um e o resto no baralho, com o corte virado. Depois, a cada rodada, quem ganhou compra primeiro e os restantes jogadores compram uma carta do baralho pela ordem da mesa, até o baralho acabar.'
    ),
    H4('s2b', '2.2 Copas batido — três cartas de cada vez'),
    P(
      't2b',
      null,
      'O cortador pode «bater» e declarar copas batido: o corte fica fixo em copas. Aqui são 4 passagens e, em cada uma, cada jogador recebe três cartas de uma vez — no fim é o mesmo: 3 cartas na mão de cada um para começar. Neste modo não há troca do 2 pelo corte.'
    ),
    H3('s3', '3. Valor das cartas (para contar pontos nas rodadas)'),
    P(
      't3',
      null,
      'Ás 11, sete 10, rei 4, valete 3, dama 2; 6, 5, 4, 3 e 2 valem zero. No baralho inteiro são 120 pontos no total.'
    ),
    H3('s4', '4. O corte define o Naipe'),
    P(
      't4a',
      null,
      'Ao cortar, o baralho é reorganizado e fica definido o naipe de corte da partida. A carta cortada vai para baixo do baralho (fica como a última carta). A carta que fica virada no centro (o «corte» que todos veem) é a que manda no naipe para essa partida — o jogo trata disso automaticamente depois do corte.'
    ),
    P(
      't4b',
      null,
      'Se a carta do corte for Ás ou 7, o corte não é o naipe dessa carta: passa para o naipe par (ouros com copas, espadas com paus). Essa carta volta para o meio do baralho (entra outra vez no baralho), e o jogo fixa o corte certo para esses casos.'
    ),
    P(
      't4c',
      null,
      'Se for outra carta, o corte é o naipe dela e ela é a carta virada no meio que você pode trocar pelo 2 (no modo normal). Se em vez de cortar normalmente você optar por bater, o corte é sempre copas — é o «copas batido».'
    ),
    P(
      't4d',
      null,
      'Fora isso: qualquer corte ganha a cartas que não são corte; no mesmo naipe a força é Ás > 7 > R > V > D > 6 > 5 > 4 > 3 > 2.'
    ),
    H3('s5', '5. Como se joga na mesa'),
    P(
      't5a',
      null,
      'Joga-se em rodadas de quatro cartas (cada uma é uma rodada como na mesa real). Quem abre escolhe o naipe de saída. Quem ganha a rodada leva os pontos das quatro cartas e abre a seguinte. São 10 rodadas por partida de 40 cartas até as mãos esvaziarem.'
    ),
    H4('s5b', 'Troca do 2 (só modo normal)'),
    P(
      't5b',
      null,
      'Se você tiver o 2 do corte, pode trocá-lo pela carta de corte virada no baralho — até à terceira rodada dessa mão inclusive; depois disso já não dá. Em copas batido não existe esta troca.'
    ),
    H3('s6', '6. Pontuação na partida'),
    H4('s6a', '6.1 Vitória por pontos'),
    P(
      't6a',
      null,
      'Somam-se os pontos das cartas que cada equipe ganhou nas rodadas. Quem tem mais pontos ganha por pontos nessa mão e, em condições normais, marca +1 no placar da partida.'
    ),
    H4('s6b', '6.2 Réle'),
    P(
      't6b',
      null,
      'Na mesma rodada, se o 7 de corte sair logo antes do Ás de corte, é réle: a equipe que leva essa rodada ganha +1 no placar da partida.'
    ),
    H4('s6c', '6.3 Sete de abertura'),
    P(
      't6c',
      null,
      'Se a primeira carta da primeira rodada dessa mão for o 7 de corte, a equipe desse jogador ganha +1 no placar da partida.'
    ),
    H4('s6d', '6.4 Copas batido'),
    P(
      't6d',
      null,
      'Numa mão em copas batido, quem ganhar por pontos leva +2 no placar da partida de uma vez (em vez de +1). Se a equipe do cortador perder por pontos, quem ganha são os outros — e são eles que levam esses 2 pontos.'
    ),
    H4('s6e', '6.5 Empate 60–60'),
    P(
      't6e',
      null,
      'Empate a 60 por pontos: ninguém marca nessa mão, mas fica um bónus pendente — na próxima mão em que alguém ganhe por pontos, soma +1 no placar por cada 60–60 que estava em dívida.'
    ),
    H4('s6f', '6.6 Ponta (61–59)'),
    P('t6f', null, 'Ganhar 61 a 59 vale mais +1 no placar nessa mão.'),
    H4('s6g', '6.7 Capote'),
    P(
      't6g',
      null,
      'Se a equipe que perde por pontos ficar com menos de 30 nos pontos das cartas, é capote: quem ganhou leva mais +1 no placar da partida.'
    ),
    H3('s7', '7. Ganhar o jogo'),
    P(
      't7',
      null,
      'A partida acaba quando uma equipe chega a 4 pontos. Se as duas estiverem com 4 ou mais ao mesmo tempo, continua até haver desempate por pontos numa mão.'
    )
  );
}

export function bfSettingsGameplayContent(narrow, cardInputMode, onModeChange) {
  var mode = cardInputMode === "tap" ? "tap" : "drag";
  var wrap = {
    maxWidth: 760,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
  var hint = {
    margin: "0 0 4px",
    fontSize: 14,
    lineHeight: 1.55,
    color: "rgba(236,228,218,.78)",
  };
  function modeBtn(id, title, desc, recommended) {
    var active = mode === id;
    return React.createElement(
      "button",
      {
        key: id,
        type: "button",
        onClick: function () {
          onModeChange(id);
        },
        style: {
          width: "100%",
          textAlign: "left",
          padding: narrow ? "12px 14px" : "14px 16px",
          borderRadius: 12,
          border: active ? "1px solid rgba(212,168,67,.62)" : "1px solid rgba(255,255,255,.15)",
          background: active
            ? "linear-gradient(165deg, rgba(212,168,67,.2) 0%, rgba(90,50,8,.34) 100%)"
            : "linear-gradient(165deg, rgba(255,255,255,.05) 0%, rgba(255,255,255,.02) 100%)",
          boxShadow: active
            ? "0 0 0 1px rgba(212,168,67,.25) inset, 0 8px 24px rgba(0,0,0,.28)"
            : "0 6px 20px rgba(0,0,0,.22)",
          cursor: "pointer",
          color: "rgba(255,255,255,.95)",
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 } },
        React.createElement("strong", { style: { fontSize: 14, letterSpacing: 0.25 } }, title),
        recommended ? React.createElement("span", {
          style: {
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            borderRadius: 999,
            padding: "3px 7px",
            background: active ? "rgba(255,255,255,.18)" : "rgba(212,168,67,.2)",
            color: active ? "rgba(255,255,255,.94)" : "#f0d078",
          },
        }, "Recomendado") : null
      ),
      React.createElement("div", { style: { fontSize: 13, lineHeight: 1.5, color: "rgba(236,228,218,.78)" } }, desc)
    );
  }

  return React.createElement(
    "div",
    { style: wrap },
    React.createElement("p", { style: hint }, "Escolha como jogar as cartas durante a partida:"),
    modeBtn("drag", "Arrastando a carta (atual)", "Você arrasta a carta para o centro da mesa. Este é o modo padrão.", true),
    modeBtn("tap", "Clicando na carta (clássico)", "Você toca/clica na carta para jogar direto.", false)
  );
}

