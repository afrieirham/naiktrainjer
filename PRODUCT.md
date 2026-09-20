# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Renters and would-be renters in the Klang Valley looking for a place to live near rail. Two
scenes, equally weighted: someone on a phone, standing outside a specific building and deciding
whether it is close enough to a station; and someone on a laptop planning a shortlist before a
weekend of viewings. They usually arrive already knowing either a building name (from a chat, a
listing, or a friend) or a station name.

## Product Purpose

A public, hand-checked directory of places to rent near rail stations, published as a static site
at naiktrainjer.com. It exists to answer one recurring question quickly — *which station is this
near, and can I get to it from here?* — and then to hand the visitor off to the real directions or
the full place page. Success means a visitor can go from landing to a confident answer in seconds,
on either scene, without reading a wall of site copy first.

## Positioning

One corridor covered end to end, in physical line order: the Kelana Jaya line, Putra Heights to KL
Gateway. Every place is there because the maintainer personally checked it while hunting for a
rental, not because it was scraped. Coverage claims stay scoped to the one line that actually
exists. A listing aggregator cannot truthfully copy "every place on this line was checked by hand."

## Operating Context

- The site is prerendered from one data file and served statically; there is no server, database,
  or runtime API call.
- The visitor often arrives deep-linked to a single Place page from search, chat, or social, and
  the Place page must stay shareable and indexable with a real URL and a preview card.
- The core answer is delivered by an embedded Google Maps route frame, built client-side from a
  Place's coordinates and its nearest station, in walk or drive mode. The frame cannot be styled,
  read, or clicked into.
- Place suggestions arrive through an embedded third-party form (Tally).
- The maintainer runs a one-off offline Measure script and commits the results; measurement is a
  data task, never part of the build or the request path.

## Capabilities and Constraints

- Two entities: **Station** (name, line, coordinates) and **Place** (name, kind, type, station,
  alsoNear, map link, coordinates, source). 22 stations, 84 places today.
- Place is either a **Building** or an **Area**; **Type** is a controlled list. **Also near** is
  context only, never a route destination.
- A Place without a map link stays in the directory.
- Measurement fields (`walkMinutes`, `walkMeters`, `driveMinutes`) exist in the schema but **0 of
  84 places carry them today**. The current redesign deliberately does **not** build a walk-time
  number into the interface; the map route is the answer. A genuinely unmeasured future state is
  hidden, never guessed.
- Only the Kelana Jaya line exists in the data today; the line field exists so other lines are a
  data change, not a rebuild.
- View state (filters, selection, route mode) should be encoded in the URL so Back, refresh, and
  sharing all work, and so a Place selection is shareable.

## Brand Commitments

- Name: **NaikTrainJer** (Manglish for "just take the train"). It stays.
- Voice: first-person, honest, hand-checked, understated. The maintainer is visibly a person who
  did the legwork, not a brand account. No hype, no invented claims, no fabricated coverage.
- Never imply lines or areas the data does not have.

## Evidence on Hand

- `data/properties.json` — the single source of truth: 22 stations, 84 places.
- `CONTEXT.md` — the domain glossary (Place, Kind, Type, Station, Nearest station, Also near,
  Measurement, Route frame, Browse page, Place page, Preview card, Submit page, Source, Coverage).
- `docs/adr/0001-prerender-from-one-data-file.md` — the prerendering decision.
- Per-place Open Graph preview cards already generate for sharing.
- 0 of 84 places have Measurements. Future work must not fabricate walk or drive numbers.

## Product Principles

1. **Answer the walk question, don't decorate it.** Every screen's job is to get the visitor from
   "this place" to "here is the route to the station" with the fewest possible moves.
2. **The corridor is the product.** Line order is real information, not a sort option; group and
   navigate by it.
3. **The app is the whole website.** No marketing shell around a tool: one surface, task-first,
   with the context folded in rather than wrapped around.
4. **Prerendered pages are a feature, not a leftover.** Every Place and the Submit form keep a real,
   shareable, indexable URL even when navigation feels like one continuous app.
5. **Honesty over polish.** Hide what is unknown, scope every claim to the data, keep the
   maintainer's first-person voice.

## Accessibility & Inclusion

Maintain WCAG AA contrast, a visible keyboard focus ring, semantic list/group roles, and labelled
controls. Do not ship `text-[10px]` uppercase labels or low-contrast secondary text that fails AA.
Selection and result changes should be perceivable to assistive tech.
