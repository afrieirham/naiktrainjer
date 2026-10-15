# naiktrainjer

A public directory of places to rent near rail stations in the Klang Valley, published at
naiktrainjer.com. The visitor's question is always the same: *can I walk to a station from
here?*

The site is **prerendered**: the committed snapshots plus the app source build to plain static HTML,
which Cloudflare Pages serves. There is no request-time API for reading. PocketBase is the source of
truth for the data; the repository holds generated snapshots.

## Shape

- The React Router (framework mode) app lives at the repo root.
- PocketBase is the source of truth for the directory's data — the network reference and the Places
  (ADR-0008). Editing happens in its admin UI over Tailscale, not in the repository.
- The repository holds generated snapshots: `data/network.ts` (the whole network — every Line and
  its Stations) and `data/places.ts` (every Place and its Connections). Both are written by export
  scripts, never hand-edited; there is no per-file Place data.
- `docs/adr/` records the decisions behind that shape.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues on `afrieirham/naiktrainjer`, driven with the `gh` CLI.
See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles, using the default label strings (`needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
