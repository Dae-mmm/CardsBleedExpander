"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";
import {
  GAME_LABELS,
  type CardGame,
  type ResolvedCard,
} from "../lib/card-types";
import { expandBleedFromImage } from "../lib/expand-bleed";

const EXAMPLES: Record<CardGame, string> = {
  mtg: `4 Lightning Bolt
4 Counterspell
1 Sol Ring
2 Brainstorm (MMQ)`,
  pokemon: `4 Pikachu
3 Ultra Ball
2 Professor's Research
1 Mewtwo VSTAR`,
  yugioh: `3 Ash Blossom & Joyous Spring
1 Called by the Grave
3 Infinite Impermanence
1 Nibiru, the Primal Being`,
};

function fileSafeName(name: string) {
  return name
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

async function fetchCardImage(imageUrl: string) {
  const response = await fetch(
    `/api/cards/image?url=${encodeURIComponent(imageUrl)}`,
  );
  if (!response.ok) {
    throw new Error("Download immagine fallito.");
  }
  return response.blob();
}

async function withBleed(blob: Blob, bleed: number) {
  if (bleed <= 0) return blob;
  const bitmap = await createImageBitmap(blob);
  try {
    return await expandBleedFromImage(bitmap, bleed);
  } finally {
    bitmap.close();
  }
}

export function CardImporter() {
  const [game, setGame] = useState<CardGame>("mtg");
  const [list, setList] = useState(EXAMPLES.mtg);
  const [cards, setCards] = useState<ResolvedCard[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [bleed, setBleed] = useState(36);
  const [downloading, setDownloading] = useState(false);
  const [downloadNote, setDownloadNote] = useState("");

  const found = useMemo(() => cards.filter((card) => card.found), [cards]);
  const missing = useMemo(() => cards.filter((card) => !card.found), [cards]);

  async function resolveList(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    setCards([]);

    try {
      const response = await fetch("/api/cards/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, list }),
      });
      const payload = (await response.json()) as {
        cards?: ResolvedCard[];
        error?: string;
      };
      if (!response.ok) {
        setStatus("error");
        setMessage(payload.error || "Ricerca non riuscita.");
        return;
      }
      setCards(payload.cards ?? []);
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("Ricerca non riuscita. Riprova tra poco.");
    }
  }

  async function downloadZip() {
    if (found.length === 0) return;
    setDownloading(true);
    setDownloadNote("Preparazione ZIP…");

    try {
      const zip = new JSZip();
      const folder = zip.folder("cards");
      if (!folder) throw new Error("ZIP non creato.");

      let index = 0;
      for (const card of found) {
        index += 1;
        setDownloadNote(`Scarico ${index}/${found.length}: ${card.name}`);
        const base = `${String(index).padStart(3, "0")}_${card.quantity}x_${fileSafeName(card.name)}`;

        if (card.imageUrl) {
          const blob = await withBleed(await fetchCardImage(card.imageUrl), bleed);
          folder.file(`${base}${card.backImageUrl ? "_front" : ""}.png`, blob);
        }
        if (card.backImageUrl) {
          const blob = await withBleed(
            await fetchCardImage(card.backImageUrl),
            bleed,
          );
          folder.file(`${base}_back.png`, blob);
        }
      }

      folder.file(
        "list.txt",
        found
          .map(
            (card) =>
              `${card.quantity} ${card.name}${card.setName ? ` [${card.setName}]` : ""}`,
          )
          .join("\n"),
      );

      const archive = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cards-${game}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      setDownloadNote("ZIP scaricato.");
    } catch (error) {
      setDownloadNote(
        error instanceof Error
          ? error.message
          : "Download ZIP non riuscito.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-[#f4f1ea] pb-28 text-zinc-900">
      <header className="border-b border-zinc-200 bg-[#fbf8f1]/90 px-4 py-5 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Print studio
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Cards Bleed Expander
          </h1>
          <p className="max-w-2xl text-sm text-zinc-600">
            Incolla una lista, scarica le carte da Scryfall (Magic), Pokémon TCG
            API / TCGdex e YGOPRODeck (Yu-Gi-Oh!), poi aggiungi il bleed per la
            stampa.
          </p>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <form
          onSubmit={resolveList}
          className="flex h-fit flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Gioco</legend>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(GAME_LABELS) as CardGame[]).map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center rounded-xl border px-3 py-2 text-sm ${
                    game === value
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-zinc-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="game"
                    value={value}
                    checked={game === value}
                    className="sr-only"
                    onChange={() => {
                      setGame(value);
                      setList(EXAMPLES[value]);
                      setCards([]);
                      setMessage("");
                    }}
                  />
                  {GAME_LABELS[value]}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="text-sm font-medium">
            Lista carte
            <textarea
              value={list}
              onChange={(event) => setList(event.target.value)}
              rows={12}
              className="mt-1 w-full resize-y rounded-xl border border-zinc-200 bg-[#fcfbf8] px-3 py-2 font-mono text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
              placeholder="4 Lightning Bolt"
            />
          </label>
          <p className="text-xs text-zinc-500">
            Formato: <code>4 Nome Carta</code>, <code>4x Nome</code> o{" "}
            <code>2 Brainstorm (MMQ)</code>. Le righe con # o // vengono ignorate.
          </p>

          <label className="text-sm font-medium">
            Bleed in pixel ({bleed}px, circa {(bleed / 11.8).toFixed(1)} mm a 300
            dpi)
            <input
              type="range"
              min={0}
              max={72}
              step={1}
              value={bleed}
              onChange={(event) => setBleed(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {status === "loading" ? "Cerco le carte…" : "Importa lista"}
          </button>

          {message ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {message}
            </p>
          ) : null}
        </form>

        <section className="flex min-h-[420px] flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Carte trovate</h2>
              <p className="text-sm text-zinc-500">
                {cards.length === 0
                  ? "Nessuna ricerca ancora."
                  : `${found.length} trovate · ${missing.length} mancanti`}
              </p>
            </div>
            <button
              type="button"
              onClick={downloadZip}
              disabled={found.length === 0 || downloading}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
            >
              {downloading ? "Scarico…" : "Scarica ZIP"}
            </button>
          </div>

          {downloadNote ? (
            <p className="mb-3 text-sm text-zinc-500">{downloadNote}</p>
          ) : null}

          {missing.length > 0 ? (
            <div className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Non trovate: {missing.map((card) => card.name).join(", ")}
            </div>
          ) : null}

          {cards.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-[#fcfbf8] p-8 text-center text-sm text-zinc-500">
              Incolla una lista a sinistra e premi Importa lista. Le immagini
              arrivano da Scryfall, Pokémon TCG API e YGOPRODeck.
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {cards.map((card) => (
                <li
                  key={`${card.query}-${card.setName}-${card.collectorNumber}`}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
                >
                  {card.imageUrl ? (
                    // External card art from the selected catalog.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="aspect-[63/88] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[63/88] items-center justify-center bg-zinc-200 px-2 text-center text-xs text-zinc-600">
                      Non trovata
                    </div>
                  )}
                  <div className="px-2 py-2">
                    <p className="truncate text-sm font-medium">{card.name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {card.quantity}×
                      {card.setName ? ` · ${card.setName}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <p className="mx-auto max-w-6xl px-4 pb-6 text-xs text-zinc-500">
        Dati e immagini: Scryfall (Wizards of the Coast), Pokémon TCG API
        (Pokémon), YGOPRODeck (Konami). Uso per copie personali / proxy di
        stampa.
      </p>
    </div>
  );
}
