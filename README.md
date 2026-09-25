# NaikTrainJer

A public directory of places to rent near rail stations in the Klang Valley, published at
[naiktrainjer.com](https://naiktrainjer.com). The visitor's question is always the same: *can I
walk to a station from here?*

The site is **prerendered**: the data records plus the app source build to plain static HTML, which
Cloudflare Pages serves. There is no database and no request-time API for reading. Pages Functions
under `/api/*` handle Contributions.

## Stack

- React Router (framework mode, v8) + React 19, ssr prerendered
- Vite + Tailwind CSS v4
- Cloudflare Pages + Pages Functions (KV for rate limiting, GitHub as the write target)
- Node `>=22.22.0` (see `engines`)

## Quick start

```sh
npm install
npm run dev
```

Then open the URL Vite prints.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server. |
| `npm run build` | Prerender every route, then generate the Open Graph preview cards. Retries the flaky prerender step up to 3 times. |
| `npm run build:once` | One pass of `react-router build` plus card generation, no retry. |
| `npm test` | Run the `node:test` suite in `tests/`, including data validation. |
| `npm run typecheck` | React Router typegen + `tsc`. |
| `npm run icons` | Regenerate the favicon/app icons. |
| `npm run export-network` | Refresh `data/network.ts` from the PocketBase network reference. |

## Data

Everything the directory knows lives in two places:

- `data/network.ts` — the whole network: every Line and its Stations. **Generated** by
  `scripts/export-network.mjs`; do not hand-edit, run `npm run export-network` instead.
- `data/places/<slug>.json` — one file per Place (84 today). Together these are the source of
  truth; nothing else holds place data.

A Place record looks like:

```json
{
  "slug": "amcorp-service-suite",
  "name": "Amcorp Service Suite",
  "kind": "building",
  "type": "service-apartment",
  "map": "https://maps.app.goo.gl/...",
  "connections": [
    { "station": "KJ20", "embed": "https://www.google.com/maps/embed?pb=..." }
  ],
  "source": "owner"
}
```

A Place is either a **Building** or an **Area**; `type` is a controlled list. `map` is the
required Google Maps link. Each **Connection** is one Station the Place is near, with an optional
`embed` Route frame — the hand-pasted Google Maps walking embed for that Place→Station pair. A
Connection without one falls back to the Place's Map link. Measurement fields (`walkMinutes`,
`walkMeters`, `driveMinutes`), `station`, `alsoNear` and `coordinates` are forbidden by the
validator.

Run `npm test` (or `node scripts/validate-data.mjs`) to check the records against the network and
the controlled lists.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Browse page: Line selector, type filter, corridor list, detail panel with the Route frame. |
| `/places/:slug` | Prerendered Place page, shareable and indexable, with a preview card. |
| `/contribute` | Public form to propose a Place (Turnstile + rate limiting). |
| `/contributors` | Credits for people who contributed. |
| `/admin` | Maintainer shell for reviewing Contributions and editing Places. Protected by Cloudflare Access. |
| `/sitemap.xml`, `/robots.txt` | Generated from the single route list in `app/lib/routes.ts`. |

## Contributions

A visitor's proposed Place is a **Contribution**: private until the maintainer approves it, at
which point it becomes a published Place (ADR-0005). The write path is:

1. `/contribute` posts to `/api/contribute` (Turnstile check, KV rate limit).
2. The handler commits the Contribution to GitHub.
3. The maintainer reviews it at `/admin` and approves it into `data/places/<slug>.json`.

`/admin` and `/api/admin/*` are protected by a Cloudflare Access application configured in the
dashboard, not in this repo. `/api/contribute` and `/api/config` stay public.
`scripts/setup-contribute-credentials.sh` provisions the KV namespace, Turnstile keys, and Pages
secrets.

## Docs

- `CONTEXT.md` — the domain glossary (Place, Kind, Type, Station, Line, Coverage, …).
- `PRODUCT.md` — users, purpose, positioning, principles.
- `DESIGN.md` — interface design.
- `docs/adr/` — the decisions behind the shape.
- `docs/agents/` — issue tracker and triage conventions.
