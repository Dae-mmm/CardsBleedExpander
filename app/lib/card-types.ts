export type CardGame = "mtg" | "pokemon" | "yugioh";

export type CardQuery = {
  quantity: number;
  name: string;
  set?: string;
  number?: string;
};

export type ResolvedCard = {
  query: string;
  quantity: number;
  name: string;
  setName?: string;
  collectorNumber?: string;
  imageUrl: string | null;
  backImageUrl?: string | null;
  source: CardGame;
  sourceUrl?: string;
  found: boolean;
};

export const GAME_LABELS: Record<CardGame, string> = {
  mtg: "Magic: The Gathering",
  pokemon: "Pokémon",
  yugioh: "Yu-Gi-Oh!",
};
