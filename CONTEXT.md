# naiktrainjer — domain context

A public directory of places to rent near rail stations in the Klang Valley, at
naiktrainjer.com. The visitor's question is always *can I walk to a station from here?*
Everything below exists to answer it.

The directory covers the rail network corridor by corridor. Every Place is there because the
maintainer approved it, either researched by hand or contributed by a visitor. What has been
covered is stated as a count of the Line's Stations that hold Places, never implied away.

## Language

**Place** — one entry in the directory. Every Place is either a Building or an Area, never
both and never neither. Prefer "Place" over "listing", "property", "item", or "row" in issue
titles, test names, and UI copy.

**Kind** — which of the two shapes a Place takes: `building` or `area`. Required on every
Place. Not to be confused with **Type**.

**Building** — a Place that is a specific named property: a condominium, apartment, service
apartment, flat, terrace, or shop/office.

**Area** — a Place that is a named neighbourhood rather than a building, e.g. `Subang SS 14`.
An Area has one or more Connections and a map link but no building of its own, so its page
describes a neighbourhood, never a property.

**Type** — the classification of a Building (`condominium`, `service apartment`, `apartment`,
`flat`, `terrace`, `shop/office`) or of an Area (`area`). A controlled list, not free text.

**Station** — a rail station a Place is near: a name, a network **code**, and a **Line**. The
network reference holds every Station on every Line the network has, whether or not the
directory holds a Place there.

**Line** — the rail line a Station belongs to, with a name and a colour. Browsing is
line-scoped: the Browse page shows one Line at a time, and a selector chooses which.

**Corridor position** — a Station's own `sort` on its Line, which is how the corridor is
ordered on the page: descending, i.e. south → north, so the content comes first and the tail
sits last. It is the reverse of the network's own order, taken deliberately.

**Connection** — one Station a Place is near, with the optional hand-pasted **Route frame** for
that Place→Station pair (`connections`, `{ station, embed }`). Every Place has one or more.
All Connections are equal: there is no "nearest station", and a Place near two Stations answers
the walk question for each.

**Also near** — the other Stations a Place is shown beside, as Browse labels them beside the
viewed Station: every other Station it Connects to, and, for a Connection to a Connecting
Station, that Station's neighbour, which reuses the anchor Connection's route. Derived from
Connections; never stored.

**Map link** — the Google Maps link for a Place, as researched by hand (`map`). Required on every
Place: it is what the Place opens in when no Route frame is stored.

**Measurement** — the walk and drive figures from a Place to a Station. **Retired**: the Measure
script and its providers are gone from the repo, and nothing computes the figures. Measurement was
never part of the build or the request path. **Not surfaced in the interface**: the Route frame is
the answer to the walk question, and the data validator forbids the fields, so no figure can reach
a page.

**Route frame** — the Google Maps iframe for one Place→Station walk (`embed`), pasted by hand and
stored whole, never calculated. Optional per Connection; the driving view is derived from the
stored walking link, and a Connection without one shows the Place's Map link as a plain link
instead of a frame.

**Browse page** — the directory itself: the Line selector, the type filter, the corridor list
— every Station on the selected Line, those with Places grouped and those without marked — and
the detail panel with the Route frame.

**Place page** — the prerendered page for a single Place, at its own URL, shareable and
indexable.

**Preview card** — the generated image a Place page shows when the link is pasted into a chat
or social post.

**Contribute page** — the page holding the native form where a visitor contributes a Place.
_Prefer over_: Submit page.

**Contribution** — a visitor's proposed Place, carrying a name, one or more Connections and a
required Map link, plus optional detail.
Private until approved: a Contribution is not a Place and is never rendered. _Avoid_:
Suggestion, submission, upload.

**Contributor** — the person who made a Contribution, identified by a self-supplied name and
optional link. Contributors have no accounts. _Avoid_: User, account, member.

**Approve** — the maintainer's act of turning a Contribution into a published Place. Approval
is where a Contribution earns the directory's trust. _Avoid_: Promote, accept, verify.

**Source** — where a Place came from: `owner` (the maintainer researched it) or `contributed`
(it came from a Contribution). Every Place has one.

**Coverage** — what the directory has covered, stated as a ratio: how many of a Line's
Stations hold Places, out of how many the Line has. Derived from Places, never a record of a
walk. Every count in that copy comes from the data, and copy never implies Places, Lines or
areas the data does not have.
