# 0002 — Browse is line-scoped, and shows the whole Line

**Status:** accepted, amended by ADR-0004 (Coverage is derived from Places; there is no
checked/unchecked state, and a Line selector replaces the single covered Line).

## Context

The Browse page used to be scoped to the Stations the directory had checked: a Station filter
listed them, and the list grouped the Places under exactly those Stations. A visitor could not
tell that the corridor continued past what they were looking at, and the page's own copy
claimed a span — "from Putra Heights to KL Gateway" — that three checked Stations (Kerinchi,
Abdullah Hukum, Bangsar) sat north of. The directory was understating its own work and hiding
its own gaps at the same time.

The network reference (ADR-0003) knows all 37 Stations on the Kelana Jaya line. The directory
knew 22 of them.

## Decision

1. **Browsing is line-scoped.** The page shows one Line at a time, chosen by a Line selector. A
   Station is navigation *within* a corridor, not a top-level filter, so the Station filter is
   gone; the type filter stays.
2. **Show the whole Line, mark the gaps.** Every Station on the selected Line renders, in the
   Line's own order. A Station that holds no Places renders as one compact, non-interactive row
   marked "No places yet". The directory states what it does not have instead of implying it has
   everything.
3. **A Line appears in the selector once at least one of its Stations holds a Place.** Once it
   appears, *all* of its Stations appear. That is why every Station on a selected Line renders,
   including the many with no Places.
4. **Display order is south → north** (Putra Heights first), i.e. *descending* the network's own
   `sort`. Taken deliberately: it puts the content first and the empty tail at the end, and it
   preserves the order the page has always shown.
5. **Stations with no Places get no page.** They do not enter the prerender list and do not enter
   `sitemap.xml`: a landing page that promises nothing is worse than no page.
6. **Coverage is derived from Places, not from a record of a walk.** A Station is covered when it
   holds at least one Place; there is no checked flag and no separate Station entity. *(This
   replaces the original decision 6, which kept a checked Stations list in the data file.)*

## Consequences

- Coverage copy becomes a ratio derived from Places — how many of the Line's Stations hold
  Places — and it can no longer claim a span the data does not hold.
- The page's shape is honest about its own gaps, which invites the next round of checking rather
  than hiding it.
- Adding a second line is a data change: the Line's name, colour and Station list are read from
  the network on every page, and the default Line is the one that holds Places, not the lowest
  source position (which would resolve to a Line nobody has covered).
- The sitemap stays Places-only, so no thin page is created and no crawl budget is spent on one.
- Line URLs (`/lines/kelana-jaya`) and Station URLs are **deferred** until a second Line or real
  traffic needs them.
