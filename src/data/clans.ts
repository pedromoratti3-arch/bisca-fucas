/**
 * Clãs oficiais (pré-criados). Para usar o logo oficial, coloque o arquivo em public/assets/clubes/
 * com o nome indicado em `logo`; se o arquivo não existir, o jogo desenha o emblema em SVG.
 * Clãs criados por jogadores ficam no banco (bisca/clans) e não aqui.
 */
export type ClanEmblemKind = "club-arrow" | "cards-crown" | "square" | "grad-cap" | "club-crown" | "shield" | "star" | "bolt" | "flame" | "spade" | "heart";

export type OfficialClan = {
  id: string;
  name: string;
  short: string;
  tag: string;
  color: string;
  color2: string;
  /** cor do texto sobre a cor do clã */
  fg: string;
  emblem: ClanEmblemKind;
  logo: string;
  motto: string;
  official: true;
};

export const OFFICIAL_CLANS: OfficialClan[] = [
  {
    id: "tribo-de-aracruz",
    name: "Tribo de Aracruz — Bisca Club",
    short: "Tribo de Aracruz",
    tag: "TRB",
    color: "#c41230",
    color2: "#7a0b1d",
    fg: "#ffffff",
    emblem: "club-arrow",
    logo: "/assets/clubes/tribo-de-aracruz.png",
    motto: "Flecha certeira, paus na mesa.",
    official: true,
  },
  {
    id: "divas-labubonicas",
    name: "Divas Labubônicas — Bisca Club",
    short: "Divas Labubônicas",
    tag: "DVL",
    color: "#ec4899",
    color2: "#9d174d",
    fg: "#ffffff",
    emblem: "cards-crown",
    logo: "/assets/clubes/divas-labubonicas.png",
    motto: "Coroa na cabeça, bisca na mão.",
    official: true,
  },
  {
    id: "legends",
    name: "Legends — Bisca Club",
    short: "Legends",
    tag: "LGD",
    color: "#8b5cf6",
    color2: "#4c1d95",
    fg: "#ffffff",
    emblem: "square",
    logo: "/assets/clubes/legends.png",
    motto: "Lendas não nascem. Cortam.",
    official: true,
  },
  {
    id: "legends-academy",
    name: "Legends Academy",
    short: "Legends Academy",
    tag: "LGA",
    color: "#a78bfa",
    color2: "#5b21b6",
    fg: "#ffffff",
    emblem: "grad-cap",
    logo: "/assets/clubes/legends-academy.png",
    motto: "Formando as próximas lendas.",
    official: true,
  },
  {
    id: "reis-de-paus",
    name: "Reis de Paus — Bisca Club",
    short: "Reis de Paus",
    tag: "RDP",
    color: "#f4f1ea",
    color2: "#9ca3af",
    fg: "#15161c",
    emblem: "club-crown",
    logo: "/assets/clubes/reis-de-paus.png",
    motto: "Onde o paus é rei.",
    official: true,
  },
];

export const OFFICIAL_CLAN_BY_ID: Record<string, OfficialClan> = Object.fromEntries(OFFICIAL_CLANS.map((c) => [c.id, c]));

/** Nome como aparece na Tabela de Atributos → id do clã oficial. */
export const CLAN_ID_BY_TABLE_NAME: Record<string, string> = {
  "Legends Bisca Club": "legends",
  "Reis de Paus": "reis-de-paus",
  "Legends Academy": "legends-academy",
  "Tribo de Aracruz": "tribo-de-aracruz",
  "Divas Labubônicas": "divas-labubonicas",
};

/** Emblemas disponíveis para clãs criados por jogadores. */
export const PLAYER_CLAN_EMBLEMS: ClanEmblemKind[] = ["shield", "star", "bolt", "flame", "spade", "heart"];
export const PLAYER_CLAN_COLORS: string[] = ["#c41230", "#ec4899", "#8b5cf6", "#2563eb", "#15803d", "#f59e0b", "#0891b2", "#f4f1ea"];
