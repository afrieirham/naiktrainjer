# naiktrainjer — domain context

A public directory of places to rent near rail stations in the Klang Valley, at
naiktrainjer.com. One corridor today: the Kelana Jaya line, 37 Stations, of which 22 have been
checked by hand — the southern stretch, LRT Bangsar down to LRT Putra Heights. Every entry is
there because the maintainer checked it while hunting for a rental; the unchecked stretch is
stated on the page rather than implied away.

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

Browsing is **line-scoped**: the Browse page shows one Line at a time, and shows all of it —
every Station the Line holds, checked or not, in the Line's own corridor order. The default
Line is **the Line you cover**: the one that has at least one checked Station. Deliberately not
"the Line with the lowest source position", which would resolve to a Line nobody has walked and
render an empty corridor.

**Checked** — whether a Station has been looked at by hand, which is a different fact from
whether it holds any Places. Three states:

- **checked, with Places** — in the directory's Station list, and Places sit under it;
- **checked, nothing found** — in the directory's Station list, with no Places under it;
- **not checked yet** — on the Line's Station list, absent from the directory's own list, and
  rendered as one compact, non-interactive row.

A Station is checked when it is in the directory's Station list (`stations[]`), never when it
merely has Places: the first Station the maintainer checks and finds nothing at is still
checked, and calling it "not checked yet" would be a lie.

**Corridor position** — a Station's own `sort` on its Line, which is how the corridor is
ordered on the page: descending, i.e. south → north, so the checked stretch comes first and the
unchecked tail sits at the end. It is the reverse of the network's own order, taken
deliberately.

**Nearest station** — the single Station a Place belongs to (`station`). Exactly one per
Place, always. It is the destination of that Place's route.

**Also near** — the additional Stations a Place sits between (`alsoNear`). Optional. Shown as
context; never used as a route destination.

**Map link** — the Google Maps short link for a Place, as researched by hand. Optional: 19 of
the first 84 Places have none, and a Place without one stays in the directory.

**Measurement** — the walk and drive figures from a Place to its Nearest station
(`walkMinutes`, `walkMeters`, `driveMinutes`), which the Measure script computes **once,
offline**. **Not surfaced in the interface**: no page shows a walk or drive figure, measured or
not — the Route frame is the answer to the walk question. The data validator forbids the three
fields, so no figure can reach a page. Prefer "Measurement" over "estimate", "distance API", or
"routing" in the codebase.

**Measure script** — the one-off tool that would fill in Measurements for Places that lack
them, run by the maintainer, results committed. It is **deferred as a future enhancement** and
stays in the repository untouched: nothing in the interface reads it, and it is never part of
the build or the request path.

**Route frame** — the Google Maps iframe whose URL the app builds at click time from the
Place's coordinates and the Nearest station, in walk or drive mode. It shows Google's route
and cannot be read, styled, or clicked into.

**Browse page** — the directory itself: the type filter, the corridor list — every Station on
the covered Line, checked ones grouped with their Places and unchecked ones marked — and the
detail panel with the Route frame.

**Place page** — the prerendered page for a single Place, at its own URL, shareable and
indexable.

**Preview card** — the generated image a Place page shows when the link is pasted into a chat
or social post.

**Submit page** — the page holding the embedded Tally form where a visitor suggests a Place.

**Source** — where a Place came from: `owner` (the maintainer researched it) or `submitted`.
Every Place has one.

**Coverage** — what the directory has actually checked, stated as a ratio rather than a span:
how many of a Line's Stations are checked, out of how many the Line holds, and which stretch of
the corridor is still to do. Every count and name in that copy is derived from the data, and a
stretch is named by its endpoints only when it really is one unbroken run of the corridor.
Coverage is not a claim about the Line's length, and copy never implies Places, lines or areas
the data does not have.
