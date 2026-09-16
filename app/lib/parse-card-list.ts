export type ParsedCardLine = {
  quantity: number;
  name: string;
  set?: string;
  number?: string;
};

const SECTION_HEADERS =
  /^(sideboard|side|deck|mainboard|main|pokemon|pokémon|trainer|energy|item|supporter|stadium|tool|extra\s*deck|extra|fusion|synchro|xyz|link|pendulum|skills?)\s*:?\s*$/i;

export function parseCardList(text: string): ParsedCardLine[] {
  const merged = new Map<string, ParsedCardLine>();

  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#") || line.startsWith("//")) continue;
    if (SECTION_HEADERS.test(line)) continue;

    line = line.replace(/^-\s+/, "");

    let quantity = 1;
    let rest = line;
    const counted = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (counted) {
      quantity = Math.max(1, Number.parseInt(counted[1], 10));
      rest = counted[2].trim();
    }

    let set: string | undefined;
    let number: string | undefined;

    const arena = rest.match(
      /^(.*?)\s+\(([A-Za-z0-9]{2,8})\)\s*([A-Za-z0-9]+)?\s*$/,
    );
    const tcgplayer = rest.match(/^(.*?)\s+\[([A-Za-z0-9]{2,8})\]\s*$/);
    if (arena) {
      rest = arena[1].trim();
      set = arena[2].toLowerCase();
      number = arena[3] || undefined;
    } else if (tcgplayer) {
      rest = tcgplayer[1].trim();
      set = tcgplayer[2].toLowerCase();
    }

    rest = rest.replace(/\s+/g, " ").trim();
    if (rest.length < 2) continue;

    const key = `${rest.toLowerCase()}|${set ?? ""}|${number ?? ""}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += quantity;
    } else {
      merged.set(key, { quantity, name: rest, set, number });
    }
  }

  return [...merged.values()];
}
