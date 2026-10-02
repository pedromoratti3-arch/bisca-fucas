# Fase 3 a 5 — Telas, progressão, baralhos, clãs e ranking

Resumo do que foi construído e onde mexer para ajustar cada coisa.

## Telas (todas em `src/screens/`)

| Tela | Arquivo | O que faz |
|---|---|---|
| Abertura | `IntroSplash.tsx` | Cinco cartas sobem, viram, abrem em leque e voam; logo entra com brilho. Uma vez por sessão. |
| Tela principal | `HomeHub.tsx` | Jogador no topo (moldura, nome, nível, XP), botão JOGAR grande (Solo · Criar sala · Entrar com código), atalhos com bolinha vermelha. No notebook vira 3 colunas. |
| Escolha da mesa | `RoomPickScreen.tsx` | As 4 salas com identidade própria. |
| Sala de espera | `LobbyScreen.tsx` | Código grande, convidar (compartilhar/WhatsApp/copiar), assentos das duplas, cartas flutuando e dicas rotativas. |
| Missões | `MissionsScreen.tsx` | Diárias, semanais e conquistas com botão Resgatar. |
| Coleção | `CollectionScreen.tsx` | Todos os baralhos, equipar, cadeado com requisito, animação de pacote ao desbloquear. |
| Clã | `ClanScreen.tsx` | 5 clubes oficiais em destaque, clãs de jogadores, criar/entrar/sair, membros e pontos. |
| Ranking | `RankingScreen.tsx` | Tabela de Atributos com a carta de jogador estilo Ultimate Team. |
| Perfil | `src/app/ProfileScreen.tsx` | Moldura da faixa, estatísticas, baralho em uso, faixas, conquistas, foto e apelido. |
| Configurações | `SettingsScreen.tsx` | Jogabilidade (arrastar/tocar), regras e sobre. |
| Fim de partida | `ResultScreen.tsx` | VITÓRIA/DERROTA, XP linha a linha, missões, subiu de nível, baralho novo. Intensidade por faixa. |
| Celebrações | `CelebrationOverlay.tsx` | Subiu de nível e pacotes de baralho fora da mesa (após resgatar missão). |

A mesa de jogo continua em `src/app/page.tsx` (lógica intocada). Ela agora usa as cartas do baralho equipado, o cabeçalho do design system e envia o relatório da partida para a progressão.

## Progressão (como funciona, em palavras simples)

- **XP por partida**: 40 por jogar, +60 por vencer, +6 por mão vencida (até 5), +15 por capote, +25 por Réle, +10 por 7 de abertura, +15 por copas batido, +10 por mão de 70+ pontos, +20 jogando com 2+ amigos. Contra bots rende 70%. Máximo de 25 partidas com XP por dia.
- **Níveis**: 1 a 50. A curva está em `src/data/progression.ts` (`xpToNext`). Nível 2 custa 100 XP; nível 10 cerca de 1.800; nível 20 cerca de 4.200; nível 30 cerca de 7.000.
- **Faixas** (`TIERS`): Calouro (1) · Aprendiz (5, bronze) · Encartador (10, prata) · Cortador (20, ouro) · Mestre do Trunfo (30, roxo) · Lenda da Fucape (40, holográfica). Cada faixa muda a moldura do avatar, a cor do nome e a animação de vitória (1 a 5).
- **Missões** (`src/data/missions.ts`): 3 diárias sorteadas por dia (iguais para todos), 3 semanais, e conquistas permanentes em etapas. Ao concluir, o jogador toca em Resgatar e recebe o XP (e o baralho, quando houver).
- **Baralhos** (`src/data/decks.ts`): 23 baralhos em 4 raridades. Comuns por nível 2 a 6; raros por nível 8 a 15 e missão; épicos pelos clãs oficiais (ser membro) e pelas salas (vencer 5 vezes em cada); lendários no nível 30 (Dourado), 40 (Holográfico) e 100 vitórias (Lenda da Bisca).
- **Onde fica salvo**: conta Google → `bisca/users/{uid}/progress` no Firebase (só o servidor escreve). Convidado → no próprio aparelho; ao entrar com Google pela primeira vez, o progresso é importado.
- **Motor único**: `src/lib/progress/engine.ts` calcula tudo, no servidor e no aparelho.

## Clãs

- Oficiais em `src/data/clans.ts` (nome, cor, emblema, lema). Logos: coloque PNG/SVG em `public/assets/clubes/` com os nomes indicados no arquivo; o jogo usa automaticamente.
- Clãs de jogadores ficam em `bisca/clans/{id}` no Firebase. Pontuação do clã = XP ganho pelos membros.
- Rotas: `/api/clans` (lista, criar), `/api/clans/{id}` (detalhe), `/api/clans/{id}/join`, `/api/clans/{id}/leave`.

## Tabela de Atributos

- Dados em `src/data/tabela-atributos.json` (valores fixos; edite ali). O campo `contaUid` já existe para, no futuro, ligar cada jogador à conta real.
- Empates dividem a posição. Raridade da carta: 90+ especial, 80–89 ouro, 70–79 prata, abaixo de 70 bronze.

## Páginas de conferência

- `/design` mostra todas as peças, as cartas, a coleção, o carregamento, o fundo vivo e simula vitória/derrota e abertura de pacote.
- `/design/phone?p=/` mostra qualquer tela numa moldura de celular (ex.: `?p=/design`).

## Navegação (estilo Clash Royale)

- Barra fixa embaixo com 5 botões: Coleção · Missões · **JOGAR** (maior, dourado, no centro) · Clã · Ranking. O botão da seção aberta fica maior e com o nome visível; bolinhas vermelhas mostram missões para resgatar e baralhos novos.
- Perfil (faixa do jogador) e Configurações (engrenagem) ficam no topo.
- No notebook a mesma barra aparece centralizada, com largura limitada.
- Arquivos: `src/screens/GameNav.tsx` (barra), `src/design/navIcons.tsx` (ícones com volume), `src/design/rooms.css` (estilos).

## Salas de jogo

- Ambientação por sala em `src/screens/RoomAmbience.tsx` (Terrafé: luminária, vapor e poeira; HUB: grade, varredura e LEDs; Floresta: feixes de luz, folhas e vagalumes; Sala de Aula: foco de luz, pó de giz). Referências pesquisadas em `04-salas-referencias.md`.
- Mesa com feltro texturizado e borda; carta de corte com brilho dourado; assento de cada jogador com avatar, nome, nível e emblema do clã, e anel dourado em quem está na vez. Nível/clã dos outros jogadores logados vêm de `/api/player/{uid}`.
- Entrada na sala com a animação dos naipes (nome da sala no rótulo).
