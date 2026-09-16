import { NextResponse } from "next/server";
import { parseCardList } from "../../../lib/parse-card-list";
import { resolveCards } from "../../../lib/card-providers";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { game?: unknown; list?: unknown };

  try {
    body = (await request.json()) as { game?: unknown; list?: unknown };
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const game = body.game;
  const list = typeof body.list === "string" ? body.list : "";

  if (game !== "mtg" && game !== "pokemon" && game !== "yugioh") {
    return NextResponse.json(
      { error: "Scegli Magic, Pokémon o Yu-Gi-Oh!." },
      { status: 400 },
    );
  }

  const parsed = parseCardList(list);
  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "Incolla almeno una riga con il nome di una carta." },
      { status: 400 },
    );
  }

  try {
    const cards = await resolveCards(game, parsed);
    return NextResponse.json({
      game,
      cards,
      found: cards.filter((card) => card.found).length,
      missing: cards.filter((card) => !card.found).length,
    });
  } catch (error) {
    console.error("Card resolve failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossibile cercare le carte. Riprova tra poco.",
      },
      { status: 502 },
    );
  }
}
