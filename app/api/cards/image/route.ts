import { NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "cards.scryfall.io",
  "c1.scryfall.com",
  "images.pokemontcg.io",
  "images.scrydex.com",
  "assets.tcgdex.net",
  "images.ygoprodeck.com",
]);

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url." }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed." }, { status: 400 });
  }

  const upstream = await fetch(parsed.toString(), {
    cache: "no-store",
    headers: {
      Accept: "image/*",
      "User-Agent":
        "CardsBleedExpander/1.0 (https://github.com/Dae-mmm/CardsBleedExpander)",
    },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Image download failed." },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
