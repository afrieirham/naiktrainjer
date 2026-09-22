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

A public, hand-approved directory of places to rent near rail stations, published as a static site
at naiktrainjer.com. It exists to answer one recurring question quickly — *which station is this
near, and can I get to it from here?* — and then to hand the visitor off to the real directions or
the full place page. Success means a visitor can go from landing to a confident answer in seconds,
on either scene, without reading a wall of site copy first.

## Positioning

Organised by rail corridor and physical line order. The Kelana Jaya line is covered today; any
Line can gain Places as Contributions arrive and are approved. Every place is there because the
maintainer approved it — researched by hand, or contributed by a visitor and then reviewed on
foot — not because it was scraped. Coverage claims stay scoped to what the data holds: a Line's
Stations with no Places are shown rather than implied away, and no page claims a line, a station
or a span the data does not have. A listing aggregator cannot truthfully copy "every place here
was approved by hand."

## Operating Context

- The site is prerendered from one data file and served statically; there is no server, database,
  or runtime API call.
- The visitor often arrives deep-linked to a single Place page from search, chat, or social, and
  the Place page must stay shareable and indexable with a real URL and a preview card.
- The core answer is delivered by an embedded Google Maps route frame, built client-side from a
  Place's coordinates and its nearest station, in walk or drive mode. The frame cannot be styled,
  read, or clicked into.
- Place contributions arrive through a native form on the site (the Contribute page), reviewed
  and approved by the maintainer before they publish.
- The maintainer runs one-off offline scripts — the network reference export, and a Measure
  script held back as a future enhancement — and commits their results; both write into the data
  file and neither is part of the build or the request path.

## Capabilities and Constraints

- The data has three levels: the **network** (every Line and Station the Klang Valley has, each
  Station with a corridor position), the **Place** (name, kind, type, station, alsoNear, map
  link, coordinates, source), and the **Contribution** (a visitor's proposed Place, private until
  approved). Coverage is derived from Places; there is no checked flag. The Kelana Jaya line is
  covered today — 84 places.
- Place is either a **Building** or an **Area**; **Type** is a controlled list. **Also near** is
  context only, never a route destination.
- A Place without a map link stays in the directory.
- Measurement fields (`walkMinutes`, `walkMeters`, `driveMinutes`) are **not in the schema at
  all**, and **no page shows a walk or drive figure**: the current redesign deliberately does
  **not** build a walk-time number into the interface; the map route is the answer. The Measure
  script stays in the repo, deferred, and the data validator forbids the fields, so a figure
  cannot reach a page. A genuinely unmeasured future state is hidden, never guessed.
- The network reference holds every Line, so a Contribution on any Line is a first-class case;
  Browse renders only the Lines that hold Places, chosen by a Line selector.
- View state (filters, selection, route mode) should be encoded in the URL so Back, refresh, and
  sharing all work, and so a Place selection is shareable.

## Brand Commitments

- Name: **NaikTrainJer** (Manglish for "just take the train"). It stays.
- Voice: first-person, honest, hand-approved, understated. The maintainer is visibly a person who
  did the legwork, not a brand account. No hype, no invented claims, no fabricated coverage.
- Never imply lines or areas the data does not have.

## Evidence on Hand

- `data/network.json` and `data/places/<slug>.json` — the source of truth: the whole network, and
  one file per Place (84 today).
- `CONTEXT.md` — the domain glossary (Place, Kind, Type, Station, Line, Corridor position, Nearest
  station, Also near, Measurement, Route frame, Browse page, Place page, Preview card, Contribute
  page, Contribution, Contributor, Approve, Source, Coverage).
- `docs/adr/0001-prerender-from-one-data-file.md` — the prerendering decision.
- `docs/adr/0002-browse-is-line-scoped.md` — line-scoped browsing, display order and Coverage.
- `docs/adr/0003-pocketbase-is-a-network-reference.md` — the network reference, exported by hand.
- `docs/adr/0004-one-file-per-record.md` — the per-record data layout.
- `docs/adr/0005-contributions-through-one-write-path.md` — the Contribution form and review.
- Per-place Open Graph preview cards already generate for sharing.
- No place carries a Measurement, and no page may show one. Future work must not fabricate walk
  or drive numbers.

## Product Principles

1. **Answer the walk question, don't decorate it.** Every screen's job is to get the visitor from
   "this place" to "here is the route to the station" with the fewest possible moves.
2. **The corridor is the product.** Line order is real information, not a sort option; group and
   navigate by it.
3. **The app is the whole website.** No marketing shell around a tool: one surface, task-first,
   with the context folded in rather than wrapped around.
4. **Prerendered pages are a feature, not a leftover.** Every Place and the Contribute page keep a real,
   shareable, indexable URL even when navigation feels like one continuous app.
5. **Honesty over polish.** Hide what is unknown, scope every claim to the data, keep the
   maintainer's first-person voice.

## Accessibility & Inclusion

Maintain WCAG AA contrast, a visible keyboard focus ring, semantic list/group roles, and labelled
controls. Do not ship `text-[10px]` uppercase labels or low-contrast secondary text that fails AA.
Selection and result changes should be perceivable to assistive tech.
