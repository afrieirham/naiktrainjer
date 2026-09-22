# 0003 — PocketBase is a read-only network reference, exported by hand

**Status:** accepted, amended by ADR-0004 (the network is exported whole, and the directory no
longer records checked-ness).

## Context

The directory needs to say what it has not checked yet, which means knowing the whole corridor:
all 37 Stations on the Kelana Jaya line, not only the 22 that carry Places. That knowledge lives
in the maintainer's PocketBase (`train_lines`: category, code, name, colour, `sort`, ordered
station ids; `train_stations`: code, name, `geoPoint`, line, sort), which describes the rail
network as it exists.

Two facts are in play and they are not the same fact: the network's shape (PocketBase) and what
the maintainer has checked (the directory). Names also drift between them — the network calls
KJ16 "Bank Rakyat Bangsar" and KJ19 "Universiti" while the directory calls them "LRT Bangsar"
and "LRT KL Gateway - Universiti" — so neither name nor slug can be used to match the two.

ADR-0001 promises a prerendered build with no runtime API call. A build that fetched PocketBase
would break that promise and make every deploy depend on a box on the maintainer's LAN.

## Decision

1. **PocketBase is read-only.** Nothing in the build, the site or the repo writes to it.
2. **The export is manual and offline.** `npm run export-line`
   (`scripts/export-line-reference.mjs`) pulls the network reference and writes it into
   `data/properties.json` as a top-level `lines[]` array; its output is committed. It is run by
   hand, exactly like the Measure script (ADR-0001, decision 3).
3. **It is never part of `npm run build`.** A deploy cannot depend on PocketBase being reachable.
4. **It keys on station code, never on name or slug.** `CHECKED_STATION_CODES` maps each checked
   Station's slug to its network code, and the coordinate check at export time (300 m) proves the
   mapping, so a renamed Station still resolves and a wrong mapping fails loudly.
5. **Coordinates are mapped explicitly.** PocketBase stores GeoJSON order (`geoPoint.lon`); the
   app reads `lng`. A naive copy produces `lng: undefined` and silently breaks every route frame.
6. **The whole network is exported.** Every Line and Station PocketBase holds lands in
   `data/network.json`, whether or not the directory has a Place there — the Contribution form
   lets a visitor name any Station on any Line. Which Lines Browse renders is a rendering rule
   (ADR-0002), not an export filter. *(Amended by ADR-0004: the original decision exported only
   Lines with a checked Station.)*
7. **The export carries no checked-ness.** `network.json` is a plain snapshot of the network; the
   directory's own data is Places only, and Coverage is derived from them (ADR-0002, as amended).

## Consequences

- The static-build guarantee holds: the site builds and ships with PocketBase switched off.
- The snapshot can drift from the network until someone re-runs the export — accepted, because
  the network changes slowly and a stale Station list is more honest than a build that can fail.
- `scripts/validate-data.mjs` enforces the shape (a duplicate code, an unresolvable code, a
  missing corridor position or an invalid colour all fail it) but cannot know the network, so
  the export script — not the validator — is the guard on mapping correctness.
- The hand-maintained `CHECKED_STATION_CODES` table is a small, reviewable artifact that survives
  station renames, and it fails loudly if the mapping and the checked Station list disagree.
