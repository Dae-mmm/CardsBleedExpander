# Cards Bleed Expander

Import a card list, fetch images from public catalogs, and download a ZIP with optional print bleed.

## Catalogs

- **Magic: The Gathering** — [Scryfall](https://scryfall.com)
- **Pokémon** — [Pokémon TCG API](https://pokemontcg.io)
- **Yu-Gi-Oh!** — [YGOPRODeck](https://ygoprodeck.com)

Paste lines like `4 Lightning Bolt` or `2 Brainstorm (MMQ)`.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Feedback form

The floating **feedbacks/issues report** button posts to `/api/feedback`. The destination address stays on the server.

To deliver mail, set one of these in Vercel env vars (see `.env.example`):

- `RESEND_API_KEY` (recommended), or
- `FEEDBACK_SMTP_USER` and `FEEDBACK_SMTP_PASS` (Gmail app password)

Optional: `POKEMONTCG_API_KEY` for higher Pokémon TCG API limits.
