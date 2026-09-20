# 0002 — Browse is line-scoped, and shows the whole Line

**Status:** accepted

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

1. **Browsing is line-scoped.** The page shows one Line at a time. A Station is navigation
   *within* a corridor, not a top-level filter, so the Station filter is gone; the type filter
   stays.
2. **Show the whole Line, mark what is unchecked.** Every Station on the covered Line renders,
   in the Line's own order. A Station with no Places renders as one compact, non-interactive
   row marked "Not checked yet". The directory states what it has not done instead of implying
   it has done everything.
3. **A Line appears once at least one of its Stations has been checked.** Once it appears, *all*
   of its Stations appear. That is why 15 empty Stations are shown while the network's other
   seven Lines are not.
4. **Display order is south → north** (Putra Heights first), i.e. *descending* the network's own
   `sort`. Taken deliberately: it puts the content first and the uncovered northern block at the
   tail, and it preserves the order the page has always shown.
5. **Unchecked Stations get no page.** They do not enter the prerender list and do not enter
   `sitemap.xml`: a landing page that promises nothing is worse than no page.
6. **Checked-ness lives in `data/properties.json`, not in the network reference.** A Station is
   checked when it is in the directory's Station list, never when it merely has Places, so the
   first Station checked where nothing was found is still reported as checked.

## Consequences

- Coverage copy becomes a ratio with a named remainder — how many of the Line's Stations are
  checked and which stretch is still to do — derived from the data, and it can no longer claim a
  span the data does not hold.
- The page's shape is honest about its own gaps, which invites the next round of checking rather
  than hiding it.
- Adding a second line is a data change: the Line's name, colour and Station list are read from
  the data on every page, and the default Line is *the Line you cover*, not the lowest source
  position (which would resolve to a Line nobody has walked).
- The sitemap stays Places-only, so no thin page is created and no crawl budget is spent on one.
- Line URLs (`/lines/kelana-jaya`) and Station URLs are **deferred** until a second Line or real
  traffic needs them.
