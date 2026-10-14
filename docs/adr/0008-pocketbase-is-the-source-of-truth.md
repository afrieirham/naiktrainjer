# 0008 — PocketBase is the source of truth, and the repo holds a generated snapshot

**Status:** accepted. Amends ADR-0001 (decision 1), ADR-0003 and ADR-0004; supersedes ADR-0005.

## Context

The network reference already lives in the maintainer's PocketBase (ADR-0003), exported by hand. The
Places lived in the repository, one JSON file each (ADR-0004), written through a GitHub
pull-request path (ADR-0005). The maintainer now keeps the Places in PocketBase too:
`naiktrainjer_places`, plus one `naiktrainjer_connections` record per Place→Station pair, so a Route
frame (ADR-0006) has somewhere to live.

PocketBase runs on the maintainer's LAN at `pocketbase.pi`, reached over Tailscale. Cloudflare — the
build and its Pages Functions — cannot reach it. The site stays prerendered with no request-time API
call (ADR-0001), so it cannot read PocketBase live.

## Decision

1. **PocketBase is the source of truth for the directory's data** — the network reference, and now
   the Places and Connections. Editing happens in the PocketBase admin UI over Tailscale, not in the
   repository.
2. **The repository holds a generated snapshot.** `scripts/export-places.mjs` reads PocketBase and
   writes `data/places.ts` (a generated module, like `data/network.ts`), resolving each Connection's
   Station relation to a network code and rebuilding the record the app reads
   (`{ slug, name, kind, type, map, connections: [{ station, embed? }], source, contributor }`). It is
   never hand-edited.
3. **The build never contacts PocketBase.** The app reads the snapshot; a deploy depends only on the
   repository.
4. **Syncing is a manually-triggered GitHub Action.** It joins the tailnet with a Tailscale auth key
   secret, runs the export, and commits the snapshot to `main`; Cloudflare Pages builds from the push.
   The maintainer runs it after adding, updating or removing data in PocketBase.
5. **A Route frame lives on its Connection.** Adding a Place is the Place record plus one Connection
   per Station.
6. **Submissions are paused.** The public Contribute page and its endpoint are turned off, and the
   app's write path (`/admin`, `/api/admin/*`) is retired: it wrote repository files that no longer
   feed the site.

## Considered Options

- **Fetch PocketBase at build time** (a Cloudflare build, or a CI build+deploy over Tailscale) —
  rejected: it couples every deploy to the box being awake and the tailnet credential being valid,
  the coupling ADR-0003 deliberately avoided.
- **Fetch at runtime / a live API** — rejected: it breaks the prerender guarantee (ADR-0001) and would
  need the box exposed publicly.
- **Keep editing repository files through pull requests** — rejected: that is what the maintainer is
  moving away from, and two sources of truth cannot both be right.

## Consequences

- ADR-0001 decision 1 is amended: the repository is no longer the source of truth; it holds a
  generated snapshot.
- ADR-0004 is amended: Places are one generated module, not one file per record.
- ADR-0005 is superseded: the Contribution write path is paused and retired.
- The snapshot can lag PocketBase until the maintainer runs the sync; the published site is only as
  fresh as the last sync commit.
- Editing from anywhere works through the PocketBase admin UI over Tailscale; the repository is no
  longer an editing surface.
