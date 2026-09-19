# naiktrainjer

A public directory of places to rent near rail stations in the Klang Valley, published at
naiktrainjer.com. The visitor's question is always the same: *can I walk to a station from
here?*

The site is **prerendered**: one data file plus the app source build to plain static HTML,
which Cloudflare Pages serves. There is no server, no database, and no API call at runtime.

## Shape

- The React Router (framework mode) app lives at the repo root.
- `data/properties.json` is the single source of truth for every place in the directory.
  Nothing else holds place data.
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
