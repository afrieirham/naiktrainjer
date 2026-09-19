# naiktrainjer — domain context

A public directory of places to rent near rail stations in the Klang Valley, at
naiktrainjer.com. One corridor today: the Kelana Jaya line, Putra Heights to KL Gateway. Every
entry is there because the maintainer checked it while hunting for a rental.

The visitor's question is always *can I walk to a station from here?* Everything below exists
to answer it.

## Glossary

**Place** — one entry in the directory. Every Place is either a Building or an Area, never
both and never neither. Prefer "Place" over "listing", "property", "item", or "row" in issue
titles, test names, and UI copy.

**Kind** — which of the two shapes a Place takes: `building` or `area`. Required on every
Place. Not to be confused with **Type**.

**Building** — a Place that is a specific named property: a condominium, apartment, service
apartment, flat, terrace, or shop/office.

**Area** — a Place that is a named neighbourhood rather than a building, e.g. `Subang SS 14`.
An Area has a station and a map link but no building of its own, so its page describes a
neighbourhood, never a property.

**Type** — the classification of a Building (`condominium`, `service apartment`, `apartment`,
`flat`, `terrace`, `shop/office`) or of an Area (`area`). A controlled list, not free text.

**Station** — a rail station a Place is measured against, with a name and a **Line**.
Normalised: one spelling, one entry, no typos, no two stations glued into one field.

**Line** — the rail line a Station belongs to. Only the Kelana Jaya line exists in the data
today; the field exists so MRT and LRT3 are a data change, not a rebuild.

**Nearest station** — the single Station a Place belongs to (`station`). Exactly one per
Place, always. It is the destination of that Place's route.

**Also near** — the additional Stations a Place sits between (`alsoNear`). Optional. Shown as
context; never used as a route destination.

**Map link** — the Google Maps short link for a Place, as researched by hand. Optional: 19 of
the first 84 Places have none, and a Place without one stays in the directory.

**Measurement** — the walk and drive figures from a Place to its Nearest station
(`walkMinutes`, `walkMeters`, `driveMinutes`), computed **once, offline**, and stored in the
data file. A Place is *measured* when it has them and *unmeasured* when it does not; an
unmeasured Place hides its walk-time line rather than showing a guess. Prefer "Measurement"
over "estimate", "distance API", or "routing" in the codebase.

**Measure script** — the one-off tool that fills in Measurements for Places that lack them,
run by the maintainer, results committed. Never part of the build or the request path.

**Route frame** — the Google Maps iframe whose URL the app builds at click time from the
Place's coordinates and the Nearest station, in walk or drive mode. It shows Google's route
and cannot be read, styled, or clicked into.

**Browse page** — the directory itself: filters, the list grouped by Station, and the detail
panel with the Route frame.

**Place page** — the prerendered page for a single Place, at its own URL, shareable and
indexable.

**Preview card** — the generated image a Place page shows when the link is pasted into a chat
or social post.

**Submit page** — the page holding the embedded Tally form where a visitor suggests a Place.

**Source** — where a Place came from: `owner` (the maintainer researched it) or `submitted`.
Every Place has one.

**Coverage** — what the directory claims to hold: every Place checked on the Kelana Jaya line,
Putra Heights to KL Gateway. Copy states Coverage honestly; it never implies lines or areas
the data does not have.
