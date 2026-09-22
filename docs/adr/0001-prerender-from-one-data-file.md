# 0001 — Prerender the directory from one data file, and bake the measurements

**Status:** accepted, amended by ADR-0002 (browse is line-scoped), ADR-0003 (PocketBase is a
read-only network reference), ADR-0004 (one file per record) and ADR-0005 (contributions through
one write path). Decision 3's interface promise is **deferred**: no interface shows a
walk or drive figure any more, and the data validator forbids the fields — the Measure script and
its providers stay in the repo as a future enhancement.

## Context

The old site is a Next.js static export whose only content is an `iframe` around a public
Notion page. Every Place lives in a Notion database that the maintainer edits; nothing on
naiktrainjer.com is indexable text, no Place has its own URL, and the walkability figures the
directory exists to provide are not stored anywhere. The mockup in `new/` proves the intended
experience but pastes Google route embeds by hand — one of 84 Places is populated.

The data is small (84 Places, one Line), owned by one person, and read-only to visitors.

## Decision

1. **The repository is the source of truth.** Every Place lives in the repo; the CSV export and
   the Notion database are retired. Adding a Place is a commit. *(Amended by ADR-0004: the single
   `data/properties.json` becomes one file per record, aggregated at build.)*
2. **Prerender everything.** The React Router framework-mode app builds the Browse page, a
   Place page per Place, the Submit page, the sitemap, and the preview cards to static files
   at build time, served by Cloudflare Pages. No server, no database, no request-time API call
   and no key in the browser.
3. **Measure once, offline.** Walk and drive figures are computed by a Measure script on the
   maintainer's machine and written into the data file. The routing provider is undecided; the
   script is written behind a provider seam so either a billing-enabled Google key or a free
   key-based provider can be plugged in. *(Amended: the figures are no longer surfaced in the
   interface — the Route frame is the answer to the walk question — so measurement is deferred as
   a future enhancement and the data file cannot carry the fields.)*
4. **The map is Google's frame, built at click time.** The Route frame URL is assembled from
   coordinates (`walk`/`drive`), needing no key, and is treated as replaceable: if the
   undocumented URL shape breaks, it becomes the keyed Embed API behind the same component.
5. **The Place is the unit of URL.** Every Place gets a prerendered page; the directory claims
   Coverage honestly (one Line, the corridor actually checked) rather than implying more.

## Consequences

- Git becomes the content workflow, with readable diffs and reviewable changes; editing from a
  phone is no longer possible, and that is accepted.
- Anything that needs a server — a live submission pipeline, server-side search, moderation —
  has to arrive as a Pages Function for one endpoint rather than as a Worker in front of the
  site.
- The Measurements are permanent facts about a Place/Station pair, not live values, so they
  only need computing when a Place is added, not refreshing on a schedule.
- Because everything is prerendered, filter state cannot be encoded in query strings for
  search; if filtered views should be indexable, they need real paths (station pages), which
  are deliberately out of scope for now.
