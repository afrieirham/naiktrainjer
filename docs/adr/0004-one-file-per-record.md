# 0004 — The repository holds one file per record

**Status:** accepted, amends ADR-0001 (decision 1).

## Context

ADR-0001 put every Place, Station and Line in a single `data/properties.json`, on the grounds
that the data is small and adding a Place is a commit. That held while the maintainer was the
only writer and every change went in as one reviewed commit.

It stops holding once a Contribution can arrive as its own pull request. Every Contribution PR
would touch the same 400-line array, so two open Contributions conflict with each other and
with any edit in flight, and a one-record change renders as a diff against a file the reviewer
has to read around. The same argument rules out leaving the checked Stations in a shared file.

## Decision

Data is stored one record per file, and the app reads it through a single aggregate module:

- `data/network.ts` — the whole network: every Line and its Stations. The machine-written
  PocketBase export (ADR-0003); never hand-edited.
- `data/places/<slug>.json` — one file per Place.
- `data/contributions/<id>.json` — a Contribution, written only on a PR branch and never merged.

There is no aggregate file on disk. A module globs the records and returns the network's Lines and
the Places, so routes and tests keep one import. A Place names its Station by
network **code**, not by a checked-Station slug, because the checked Station no longer exists as
an entity (ADR-0002, as amended).

## Consequences

- ADR-0001 decision 1 is amended: the source of truth is the set of record files, not one file.
  The rest of ADR-0001 — prerender everything — is unchanged.
- `data/properties.json` is retired. The existing records were split by a one-off migration, which
  has since been removed: it also wrote the transitional checked-Stations file that the derived
  Coverage change (ADR-0002, as amended) deleted.
- Anything a PR can add is its own file, and the one machine-written artifact (`network.ts`) is
  kept away from the records the maintainer and contributors write.
