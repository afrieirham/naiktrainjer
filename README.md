# NaikTrainJer

A public directory of places to rent near rail stations in the Klang Valley, published at
[naiktrainjer.com](https://naiktrainjer.com). The visitor's question is always the same: *can I
walk to a station from here?*

The site is **prerendered**: the committed snapshots plus the app source build to plain static HTML,
which Cloudflare Pages serves. There is no request-time API for reading. PocketBase is the source of
truth (ADR-0008); the repository holds generated snapshots, refreshed by a manually-triggered Action.

## Stack

- React Router (framework mode, v8) + React 19, ssr prerendered
- Vite + Tailwind CSS v4
- Cloudflare Pages (static; the build never contacts PocketBase)
- PocketBase as the source of truth (`naiktrainjer_places`, `naiktrainjer_connections`), synced by a
  manually-triggered GitHub Action
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
| `npm run export-places` | Refresh `data/places.ts` from the PocketBase Places and Connections. |

## Data

PocketBase is the source of truth for the directory's data — the network reference and the Places
(ADR-0008). Editing happens in the PocketBase admin UI, reached over Tailscale; the repository is
not an editing surface. The repository holds a generated snapshot instead:

- `data/network.ts` — the whole network: every Line and its Stations. **Generated** by
  `scripts/export-network.mjs`; do not hand-edit, run `npm run export-network` instead.
- `data/places.ts` — every Place and its Connections (84 Places today). **Generated** by
  `scripts/export-places.mjs`; do not hand-edit, run `npm run export-places` instead.

The snapshot is refreshed by the manually-triggered **Sync places** GitHub Action
(`.github/workflows/sync-places.yml`): it joins the tailnet, runs `npm run export-places`, and commits
`data/places.ts`, and the push triggers the Cloudflare build. Neither the build nor the request path
ever contacts PocketBase.

Both export scripts require a Tailscale connection and an explicit `POCKETBASE_URL` environment
variable; there is no default host. Set it in your shell before running an export. Keep the actual
address out of committed files. The sync Action uses the repository variable `POCKETBASE_URL`;
update that variable when moving hosts.

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
| `/sitemap.xml`, `/robots.txt` | Generated from the single route list in `app/lib/routes.ts`. |

## Contributions

Submissions are paused: the public Contribute page and its endpoint are turned off, and the
maintainer's write path (`/admin`, `/api/admin/*`) is retired — it wrote repository files that no
longer feed the site (ADR-0008). The maintainer now adds and edits Places directly in the PocketBase
admin UI and runs the sync Action to publish them.

## Docs

- `CONTEXT.md` — the domain glossary (Place, Kind, Type, Station, Line, Coverage, …).
- `PRODUCT.md` — users, purpose, positioning, principles.
- `DESIGN.md` — interface design.
- `docs/adr/` — the decisions behind the shape.
- `docs/agents/` — issue tracker and triage conventions.
