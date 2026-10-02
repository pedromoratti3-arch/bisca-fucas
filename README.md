# Bisca Fucas

Jogo de bisca online (4 jogadores, duplas) feito para a galera da Fucape. Funciona no celular e no notebook.

## Rodar no seu computador

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Para o login com Google e o modo online funcionarem, copie `.env.example` para `.env.local` e preencha as chaves (o arquivo explica cada uma).

Páginas úteis durante o desenvolvimento:

- `/design` — guia visual do design system (cores, botões, cartas, baralhos, animações, telas de resultado).
- `/design/phone?p=/` — qualquer tela dentro de uma moldura de celular.

## Onde fica cada coisa

| Pasta | O que tem |
|---|---|
| `src/app/page.tsx` | A mesa de jogo e o fluxo de salas online (lógica da bisca e do multiplayer). |
| `src/lib/bisca/` | Regras puras, motor de simulação e a IA dos bots. |
| `src/screens/` | Telas: início, missões, coleção, clã, ranking, sala de espera, resultado, abertura. |
| `src/design/` | Design system: tokens, componentes, cartas, fundo animado, carregamento. |
| `src/data/` | Dados editáveis: baralhos, missões, curva de XP e faixas, clãs oficiais, Tabela de Atributos. |
| `src/lib/progress/` | Motor da progressão (XP, missões, desbloqueios) e o hook do navegador. |
| `src/lib/server/` | Login, perfil, progressão e clãs no servidor (Firebase Admin). |
| `src/app/api/` | Rotas do servidor. |
| `docs/redesign/` | Decisões e explicações do redesign, em linguagem simples. |
| `scripts/sim/` | Simuladores para calibrar a IA (`npm run bot:testes`, `npm run bot:torneio`). |

## Dados que você pode editar sem programar

- **Tabela de Atributos**: `src/data/tabela-atributos.json`.
- **Baralhos**: `src/data/decks.ts` (copie um bloco e troque nome, cores e requisito).
- **Missões**: `src/data/missions.ts`.
- **Curva de XP e faixas**: `src/data/progression.ts`.
- **Logos dos clubes**: coloque em `public/assets/clubes/` com os nomes listados em `src/data/clans.ts`.

## Publicar

O projeto roda na Vercel com Node 24. As variáveis de ambiente são as mesmas do `.env.example`.
