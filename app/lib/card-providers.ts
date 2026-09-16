import type { CardGame, CardQuery, ResolvedCard } from "./card-types";

export type { CardGame, CardQuery, ResolvedCard };

const USER_AGENT =
  "CardsBleedExpander/1.0 (https://github.com/Dae-mmm/CardsBleedExpander; scryfall/pokemontcg/ygoprodeck client)";

const SCRYFALL = "https://api.scryfall.com";
const POKEMON = "https://api.pokemontcg.io/v2/cards";
const YGO = "https://db.ygoprodeck.com/api/v7/cardinfo.php";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("User-Agent", USER_AGENT);
  headers.set("Accept", "application/json");
  return fetch(url, { ...init, headers, cache: "no-store" });
}

function queryKey(card: CardQuery) {
  return [card.name, card.set ?? "", card.number ?? ""].join("|");
}

function emptyResult(card: CardQuery, source: CardGame): ResolvedCard {
  return {
    query: card.name,
    quantity: card.quantity,
    name: card.name,
    setName: card.set,
    collectorNumber: card.number,
    imageUrl: null,
    source,
    found: false,
  };
}

type ScryfallCard = {
  name: string;
  set_name?: string;
  collector_number?: string;
  scryfall_uri?: string;
  image_uris?: { png?: string; large?: string };
  card_faces?: Array<{
    name?: string;
    image_uris?: { png?: string; large?: string };
  }>;
};

function scryfallImages(card: ScryfallCard) {
  const front =
    card.image_uris?.png ||
    card.image_uris?.large ||
    card.card_faces?.[0]?.image_uris?.png ||
    card.card_faces?.[0]?.image_uris?.large ||
    null;
  const back =
    card.card_faces?.[1]?.image_uris?.png ||
    card.card_faces?.[1]?.image_uris?.large ||
    null;
  return { front, back };
}

function toScryfallResult(query: CardQuery, card: ScryfallCard): ResolvedCard {
  const images = scryfallImages(card);
  return {
    query: query.name,
    quantity: query.quantity,
    name: card.name,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    imageUrl: images.front,
    backImageUrl: images.back,
    source: "mtg",
    sourceUrl: card.scryfall_uri,
    found: Boolean(images.front),
  };
}

function scryfallIdentifier(card: CardQuery) {
  if (card.set && card.number) {
    return { set: card.set, collector_number: card.number };
  }
  if (card.set) return { name: card.name, set: card.set };
  return { name: card.name };
}

async function lookupScryfallFuzzy(query: CardQuery): Promise<ResolvedCard> {
  const fuzzyUrl = new URL(`${SCRYFALL}/cards/named`);
  fuzzyUrl.searchParams.set("fuzzy", query.name);
  if (query.set) fuzzyUrl.searchParams.set("set", query.set);
  const fuzzy = await apiFetch(fuzzyUrl.toString());
  if (!fuzzy.ok) return emptyResult(query, "mtg");
  const card = (await fuzzy.json()) as ScryfallCard;
  return toScryfallResult(query, card);
}

async function resolveMtg(cards: CardQuery[]): Promise<ResolvedCard[]> {
  const results = new Map<string, ResolvedCard>();

  for (let offset = 0; offset < cards.length; offset += 75) {
    if (offset > 0) await sleep(80);
    const chunk = cards.slice(offset, offset + 75);
    const response = await apiFetch(`${SCRYFALL}/cards/collection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifiers: chunk.map(scryfallIdentifier),
      }),
    });

    if (!response.ok) {
      throw new Error(`Scryfall error ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: ScryfallCard[];
    };

    const remaining = new Map(chunk.map((card) => [queryKey(card), card]));
    for (const card of payload.data ?? []) {
      const exact = chunk.find(
        (query) => query.name.toLowerCase() === card.name.toLowerCase(),
      );
      const byCollector = chunk.find(
        (query) =>
          Boolean(query.set && query.number) &&
          card.collector_number?.toLowerCase() === query.number?.toLowerCase(),
      );
      const query = exact || byCollector;
      if (!query) continue;
      remaining.delete(queryKey(query));
      results.set(queryKey(query), toScryfallResult(query, card));
    }

    for (const query of remaining.values()) {
      await sleep(80);
      results.set(queryKey(query), await lookupScryfallFuzzy(query));
    }
  }

  return cards.map(
    (card) => results.get(queryKey(card)) ?? emptyResult(card, "mtg"),
  );
}

type PokemonCard = {
  name: string;
  set?: { name?: string };
  number?: string;
  images?: { large?: string; small?: string };
  tcgplayer?: { url?: string };
};

async function resolvePokemon(cards: CardQuery[]): Promise<ResolvedCard[]> {
  const resolved: ResolvedCard[] = [];
  for (const [index, card] of cards.entries()) {
    if (index > 0) await sleep(120);
    const query = new URL(POKEMON);
    const nameQuery = `name:"${card.name.replaceAll('"', "")}"`;
    query.searchParams.set("q", nameQuery);
    query.searchParams.set("pageSize", "1");
    query.searchParams.set("orderBy", "-set.releaseDate");

    const headers: HeadersInit = {};
    if (process.env.POKEMONTCG_API_KEY) {
      headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;
    }

    let response = await apiFetch(query.toString(), { headers });
    if (!response.ok) {
      resolved.push(emptyResult(card, "pokemon"));
      continue;
    }
    let payload = (await response.json()) as { data?: PokemonCard[] };
    if (!payload.data?.length) {
      const fallback = new URL(POKEMON);
      fallback.searchParams.set("q", `name:${card.name.replaceAll('"', "")}*`);
      fallback.searchParams.set("pageSize", "1");
      fallback.searchParams.set("orderBy", "-set.releaseDate");
      response = await apiFetch(fallback.toString(), { headers });
      payload = response.ok
        ? ((await response.json()) as { data?: PokemonCard[] })
        : { data: [] };
    }

    const match = payload.data?.[0];
    if (!match?.images?.large && !match?.images?.small) {
      resolved.push(emptyResult(card, "pokemon"));
      continue;
    }
    resolved.push({
      query: card.name,
      quantity: card.quantity,
      name: match.name,
      setName: match.set?.name,
      collectorNumber: match.number,
      imageUrl: match.images.large || match.images.small || null,
      source: "pokemon",
      sourceUrl: match.tcgplayer?.url,
      found: true,
    });
  }
  return resolved;
}

type YgoCard = {
  name: string;
  card_images?: Array<{ image_url?: string; image_url_small?: string }>;
};

async function resolveYgo(cards: CardQuery[]): Promise<ResolvedCard[]> {
  const byName = new Map<string, ResolvedCard>();
  const uniqueNames = [...new Set(cards.map((card) => card.name))];

  for (let i = 0; i < uniqueNames.length; i += 10) {
    if (i > 0) await sleep(150);
    const batch = uniqueNames.slice(i, i + 10);
    const url = new URL(YGO);
    url.searchParams.set("name", batch.join("|"));
    let response = await apiFetch(url.toString());
    let payload = response.ok
      ? ((await response.json()) as { data?: YgoCard[] })
      : { data: [] as YgoCard[] };

    const foundNames = new Set(
      (payload.data ?? []).map((card) => card.name.toLowerCase()),
    );
    const missing = batch.filter((name) => !foundNames.has(name.toLowerCase()));

    for (const card of payload.data ?? []) {
      const image = card.card_images?.[0]?.image_url || null;
      byName.set(card.name.toLowerCase(), {
        query: card.name,
        quantity: 1,
        name: card.name,
        imageUrl: image,
        source: "yugioh",
        sourceUrl: `https://ygoprodeck.com/card/?search=${encodeURIComponent(card.name)}`,
        found: Boolean(image),
      });
    }

    for (const name of missing) {
      await sleep(150);
      const fuzzy = new URL(YGO);
      fuzzy.searchParams.set("fname", name);
      fuzzy.searchParams.set("num", "1");
      fuzzy.searchParams.set("offset", "0");
      response = await apiFetch(fuzzy.toString());
      payload = response.ok
        ? ((await response.json()) as { data?: YgoCard[] })
        : { data: [] };
      const match = payload.data?.[0];
      if (match) {
        const image = match.card_images?.[0]?.image_url || null;
        byName.set(name.toLowerCase(), {
          query: name,
          quantity: 1,
          name: match.name,
          imageUrl: image,
          source: "yugioh",
          sourceUrl: `https://ygoprodeck.com/card/?search=${encodeURIComponent(match.name)}`,
          found: Boolean(image),
        });
      } else {
        byName.set(name.toLowerCase(), {
          query: name,
          quantity: 1,
          name,
          imageUrl: null,
          source: "yugioh",
          found: false,
        });
      }
    }
  }

  return cards.map((card) => {
    const resolved = byName.get(card.name.toLowerCase());
    if (!resolved) return emptyResult(card, "yugioh");
    return { ...resolved, quantity: card.quantity, query: card.name };
  });
}

export async function resolveCards(game: CardGame, cards: CardQuery[]) {
  if (cards.length === 0) return [];
  if (cards.length > 250) {
    throw new Error("List too long (max 250 unique lines).");
  }
  if (game === "mtg") return resolveMtg(cards);
  if (game === "pokemon") return resolvePokemon(cards);
  return resolveYgo(cards);
}
