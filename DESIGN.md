---
name: NaikTrainJer
description: Warm-paper, near-black-ink corridor system for the whole site — a Line's own colour carried as spine, marker, tint and ring, never as text.
colors:
  paper: "#faf9f7"
  band: "#f1efeb"
  ink: "#15171c"
  ink-soft: "#5c5f66"
  rule: "#e6e2db"
  rule-strong: "#d5d0c7"
  line-accent: "#ed0f4c"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  display-wide:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  section:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  control:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  xs: "4px"
  sm: "6px"
  pill: "9999px"
spacing:
  hairline: "2px"
  tight: "4px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  rail: "52px"
components:
  app-bar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "12px 16px"
  type-filter:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
  primary-button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
    typography: "{typography.control}"
  primary-button-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  quiet-button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  quiet-link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    padding: "4px"
  travel-mode:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "2px"
  travel-mode-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.xs}"
    padding: "4px 10px"
  station-band:
    backgroundColor: "{colors.band}"
    textColor: "{colors.ink}"
    padding: "10px 16px 10px 52px"
  corridor-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "12px 48px 12px 52px"
  corridor-row-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  route-strip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "12px 16px"
---

# Design System: NaikTrainJer

## Overview

**Creative North Star: "The Corridor Itself"**

The site does not present a directory that happens to list stations. It *is* the corridor: the selected Line, every stop on it, drawn south to north as a single continuous spine, with the stops that hold Places carrying them and the rest still visible and named. That world was first built on the Browse page and is now the site's own world. The `@layer base` block in `app/app.css` carries it, so every surface — the Browse page, a Place's own page, the Contribute page — stands on the same warm near-white paper ground, in near-black ink, separated by hairline rules and a warm-grey band. There is no longer a scoped world and no "old world": Inter, the Google Fonts link, the `slate`/`sky` palette, the `.browse-app` scope and the `--browse-accent` token are gone, as are the per-page `WalkDriveToggle` and the `TYPE_CLASSES` per-type colour map — the travel mode is now one shared component. The Line's own colour, read from the data and never written into the stylesheet, is the only accent on any surface, and it is never used as text.

**One world, shared chrome.** The Browse page is a full-height two-column app shell: the corridor list and the map column sit edge to edge below the app bar. A Place's own page is two columns above `md` and **route-first on a phone**, where the details column is ordered after the map and the map carries a phone-only label naming the Place and its station. The Contribute page is a single measured column (`max-w-[640px]`) under the same app bar. The chrome is shared, not per-page: one `AppBar`, one `TravelMode`, one set of authored icons.

Density is high and deliberate, and the world is **fully flat**: there are no shadows anywhere on the site. The map strip that once floated over the map and carried the system's single shadow is now a sibling *below* the map, separated by a `border-t`, so nothing covers the embedded route frame or swallows Google's own map controls. Separation comes from tone (paper against band) and from 1px rules. Motion is almost absent: hover and focus shifts are ordinary colour transitions, and one authored moment — the route strip's content arriving rather than blinking in — runs at 420ms and is disabled under `prefers-reduced-motion`. No raster is used in the interface; the only page binaries are the three Archivo `woff2` subsets and a 47 KB favicon set cut from the train photograph, whose 772 KB source sits in `assets/` and is a build input rather than a shipped asset.

**Key Characteristics:**
- One corridor at a time; line order is the only order ever shown.
- Warm paper (`#faf9f7`) ground, near-black ink (`#15171c`) text, hairline rules — site-wide, not scoped.
- A single data-driven accent: the Line's colour, as spine, marker, diagram fill, tint, and focus ring — never text.
- Fully flat: no shadows at all; depth is tone and 1px rules.
- Through-composed from the surfaces sharing one app bar, one travel mode, and one icon set.
- Archivo is the only typeface, self-hosted with no third-party font request.
- No raster is used in the interface. The only rasters that ship are the favicon set cut from the train photograph; the 772 KB source lives in `assets/` and never reaches the build.

### One world, shared surfaces

Everything in this document governs the whole site: `app/app.css` (the `@layer base` block and the `@theme` tokens `--color-paper`, `--color-band`, `--color-ink`, `--color-ink-soft`, `--color-rule`, `--color-rule-strong`, and `--font-sans: Archivo`), and every route — `app/routes/browse.tsx`, `app/routes/place.tsx`, `app/routes/contribute.tsx`. The `--line-accent` token is set inline on the root of each page from the selected Line in `data/network.json`. There is no scope to stay inside and no old world to leave alone; a new surface inherits these tokens and rules directly.

### Known and unresolved

Coverage copy is derived from Places — how many of a Line's Stations hold Places — and is stated more than once within the first viewport of the Browse page (the app bar's `N of M stations · P places`, the corridor header's paragraph, and the map column's coverage heading and its `N of M stops with places · K still empty` line). This repetition is **known and deliberately left for a future copy pass**; it is recorded here rather than silently omitted so no future edit mistakes it for an intended pattern.

The Contribute page, the Contributors page, the Line selector, and the Access-gated `/admin` forms are **not designed here yet**. The vocabulary below is authoritative, but a future pass must design those surfaces on these tokens before they ship.

## Colors

The palette is a warm neutral family plus one loud, data-owned accent. Nothing is cool, nothing is pure white, and the accent is never chosen by hand.

### Primary
- **Line Accent** (`#ed0f4c`, today the Kelana Jaya line's own colour): **read from `data/network.json` (`lines[].color`) and set as `--line-accent` on the root of every surface** — the Browse page, the Place page and the Contribute page, each from the Line it shows. It is never hardcoded in the stylesheet. Used as the corridor spine over the stops with Places, the filled stop marker, the coverage diagram's filled run and markers, the `color-mix` tint on the selected row (8% at rest, 12% on hover), the `::selection` wash (24%), and the global focus ring. **Never used as text.**

### Neutral
- **Warm Paper** (`#faf9f7`): the page ground of every surface, the route strip's surface, the unfilled stop marker's fill, and the base that all tints mix into.
- **Stop Band** (`#f1efeb`): the tone behind Station headings that carry Places and the Browse map column's backdrop; the hover wash on corridor rows and on the `Show every type` button. Separation without a card.
- **Ink** (`#15171c`): primary text, the primary button's fill, the travel-mode active segment's fill, the coverage diagram's endpoint names. **17.04:1 on paper.**
- **Ink Soft** (`#5c5f66`): secondary text — row meta, coverage paragraph, Station names with no Places, quiet links, app-bar subtitle and counts. **6.08:1 on paper** — clears AA at body size.
- **Rule** (`#e6e2db`): the default 1px hairline between regions and rows, and the `border-t` that separates the map from the route strip.
- **Rule Strong** (`#d5d0c7`): the stronger hairline on interactive edges (select, travel-mode frame, quiet button), the unfilled spine and marker, the coverage diagram's unfilled track, scrollbar thumb, and underline decoration.

### Named Rules
**The Line-Is-Never-Text Rule.** The Line's colour is a stripe, a fill, a marker, or a ring — never a glyph or a word. On white, `#ed0f4c` measures **4.18:1** (large text only), and the network reference carries eight Line colours of which four fail AA as text on white. A Line's colour cannot be relied on to carry meaning as text, so it never does — on any surface.

**The One Accent Rule.** Exactly one accent exists on the site, and it comes from the data. Do not introduce a second brand colour, a per-type hue, or a hand-picked highlight; the selected row is tinted from `--line-accent`, not from a fixed yellow or blue.

**The Data-Owns-The-Colour Rule.** The accent is `--line-accent`, defaulting to Ink when unset (`var(--line-accent, var(--color-ink))`). A second Line is a data change; the stylesheet must not need editing.

## Typography

**Display Font:** Archivo (with `system-ui, sans-serif` fallback), self-hosted as a variable font (weight 400–700, three `unicode-range` subsets, ~81 KB total) under `public/fonts/` and declared in `app/app.css`.
**Body Font:** Archivo — the same face; this world uses one family only.

The site ships **exactly one typeface and makes no third-party font request**: `app/root.tsx` exports no `links` and loads no web font, so Archivo arrives from the site's own origin with nothing render-blocking in the critical path.

**Character:** A signage grotesque doing directory work. Tight negative tracking at display sizes, uppercase wide tracking on small labels, and tabular figures wherever a count or station code appears. The single face keeps the corridor feeling like one continuous strip rather than a stack of components, and the same ramp is used on every surface.

### Hierarchy

The ramp is **six pixel values across five roles**; no surface invents a seventh size.

- **Display** (700, 26px → 34px at `sm`, line-height 1.05–1.1, letter-spacing −0.02em to −0.03em): the Browse page's coverage heading, and the `h1` of the Place page and the Contribute page. (On the Browse page the display statement is an `h2`; that page's `h1` is the 12px uppercase Line label below.)
- **Section** (600–700, 16px, line-height ~1.2, letter-spacing −0.01em to −0.03em): the corridor diagram's south and north endpoint names, the app-bar `NaikTrainJer` wordmark, and a phone's route-column map label naming the Place.
- **Body** (400; names and field values at 600; 13.5px, line-height 1.5–1.625): the corridor header's coverage prose, a Place's name in the corridor list, a Station's name with no Places, the coverage counts line, the route strip's instruction and its named answer, a Place page's descriptive sentence and its field values, and the `No places match that type.` empty state.
- **Control** (500–600, 12.5px): every control and quiet link — the app-bar subtitle and counts, the type filter's label and its native select, every primary and quiet button, the travel-mode segments, the `All places` back control, the `Full page` / `On Maps` / `Place on Google Maps` links, the route strip's `kind · type · station` meta, and the Contribute form's fields and note.
- **Label** (700, 12px, letter-spacing 0.1em–0.12em, uppercase): the `KELANA JAYA LINE` corridor heading, each Station heading that carries Places, and the Place page's `NEAREST STATION` / `ALSO NEAR` field labels. The same 12px step also carries the smallest tabular meta at 400–600 weight — a station's Place count, a row's `kind · type`, and the `No places yet` note.

Counts, station codes, and coverage ratios render with `tabular-nums` so digits do not jitter as the list filters.

### Named Rules
**The One Face Rule.** The site uses Archivo and nothing else. Do not introduce a display face, a serif, a mono, or a second grotesque; tabular figures supply the numeric texture that a mono would otherwise provide.

**The Tabular Figures Rule.** Any number the visitor compares — station counts, coverage ratios, stop totals — is set in tabular numerals, never proportional.

**The Six-Step Ramp Rule.** Every size on the site is one of six pixel values: 12, 12.5, 13.5, 16, 26, 34. A new surface reuses a step; it does not add one, and it does not build a private scale.

## Layout

The site is an app shell. The Browse page is `h-dvh` and non-scrolling at the root (`overflow-hidden`), with each column scrolling inside itself; the Place page is `min-h-dvh` on a phone and `md:h-dvh md:overflow-hidden` above that; the Contribute page is `min-h-dvh` and scrolls as one measured column. An `AppBar` spans the top of every surface and is `sticky top-0 z-30`, separated by a 1px `rule` bottom border and wrapping freely on narrow screens (`flex-wrap`, `gap-x-5`/`gap-y-2.5`, `px-4 py-3` → `sm:px-6`).

On the Browse page, two columns sit edge to edge below the bar: the corridor list (`w-full` on a phone, `md:w-[420px] md:shrink-0`, `md:border-r`) and the map column (`flex-1`, `bg-band`). The split appears at `md` (768px); below that the two are mutually exclusive — the corridor fills the screen, and selecting a Place swaps in the map column (the corridor is `hidden md:flex` when a Place is selected, otherwise `flex`). The map column stacks the frame (`flex-1`) over the route strip (`shrink-0 border-t border-rule`), so the strip never covers the map.

On the Place page the two columns are a `flex-col md:flex-row`: on a phone the route section is `order-1` and the details section is `order-2` (route-first, details below); at `md` the details column takes `md:order-1 md:w-[420px] md:border-r` and scrolls inside itself while the route column takes `md:order-2 md:flex-1`. The phone's map is `h-[52vh]`; the route strip (`shrink-0 border-t border-rule`, with the shared `TravelMode`, `Open route`, and `Place on Google Maps`) sits below it on every width.

The Contribute page's body is one column: `mx-auto w-full max-w-[640px] px-5 py-10 sm:py-14`, holding the `Contribute a place` display heading and the native form beneath it.

The corridor's rhythm is a fixed left rail of 52px (`pl-[52px]`) carrying the spine and stop markers, so names and counts align down the whole list. Station headings sit on a `band` strip with `py-2.5`; Place rows run `py-3` with `pr-12` to clear the trailing page-link icon; rows with no Places are a compact `py-2` line. The corridor header (`px-5 pb-3.5 pt-4`) carries the Line's identity and the coverage paragraph. Spacing is a 4px-based rhythm; the recurring steps are 2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 40, 48, and the 52px rail. The corridor diagram's stops widen from 14px to 18px at `min-[1400px]` so the spine stays proportionate on a wide monitor.

### Named Rules
**The Corridor Order Rule.** Line order — descending `sort`, south to north — is the only order the corridor is ever shown in. There is no A–Z sort and no "most places" sort; the corridor is real information, not a sort option.

**The Rule-Not-Card Rule.** Regions and rows are separated by 1px rules and by tone (paper against band), never by cards, borders-on-all-sides, or shadows. There is no exception left: the map strip is now separated by the same hairline as everything else.

**The Route-First Rule.** On a phone, a Place page leads with the route: the map column is ordered before the details column, and the map carries a label naming the Place and its station. At `md` the order swaps to details-then-route.

## Elevation & Depth

This system is **fully flat — there are no shadows anywhere**. Depth is conveyed entirely by tonal layering (`paper` against `band`) and by hairline rules, and by the sticky app bar's hairline against the content beneath it. The map strip, which once overlaid the map and carried the world's single shadow, was moved out of the map's box and is now a sibling *below* it behind a `border-t border-rule`; the shadow that licensed the overlay is retired with it, and no element on any surface is elevated. The Browse page's app bar and the Place page's route column are flat too.

### Named Rules
**The Flat-By-Default Rule.** The world has no shadow vocabulary. If a new element needs to feel raised, express it as tone or a hairline rule instead — do not add a `box-shadow`. Any shadow on any surface is a defect, not a variation.

## Shapes

The form language is quiet and functional. Controls take a small radius: **6px** (`rounded-md` = `--radius-md`, 0.375rem) on the type filter, primary buttons, the quiet button, and the travel-mode frame. A **4px** radius is reserved for small hit areas — the map strip's `All places` back control and a row's trailing icon link (the bare `rounded`) — and for the travel-mode's active segment. The corridor is **round**: the spine is a 2px `rounded-full` stroke, stop markers are perfect circles (14px, 18px at `min-[1400px]`), and the coverage diagram's track, fill, and dots are all `rounded-full`. Borders are always hairlines — 1px `rule` for structure, 1px `rule-strong` for interactive edges, 2px for the spine and for a stop marker's ring (3–4px on the oversized diagram marker). There is no clipping, no thick side-tab, and no decorative geometry; the only circles belong to the corridor.

### Named Rules
**The Hairline Rule.** Structure is drawn with 1px rules. A 2px line is reserved for the corridor spine and a stop marker's ring; anything thicker is a defect. A selected row is signalled by a tint plus a filled marker, never by a thick edge.

## Components

### App Bar
- **Shape:** full-width, flat, 1px `rule` bottom border; no radius, no shadow; `sticky top-0 z-30`.
- **Contents:** the `NaikTrainJer` wordmark (16px/700, −0.03em, the way home), an optional Line subtitle (12.5px `ink-soft`), an optional per-surface `filter`, and a trailing group (`ml-auto`) holding the coverage counts (12.5px, `tabular-nums`, `ink-soft`, hidden below `sm`) and the bar's action.
- **Behaviour:** wraps on narrow screens. On Browse the filter is the type filter and the action is `Contribute a place`; on Place and Contribute the action is a button (`Contribute a place` / `Browse places`). It is the site's only navigation chrome, so no page needs a separate back link in its body.

### Buttons
- **Shape:** 6px radius (`rounded-md`).
- **Primary:** `ink` fill, `paper` text, 12.5px/600, `px-3 py-1.5`; used for `Contribute a place`, `Browse places`, and `Open route`.
- **Hover / Focus:** `hover:opacity-85` with an opacity transition; focus takes the global ring — `2px` `--line-accent` at `2px` offset (falling back to Ink).
- **Quiet button:** `rule-strong` hairline, transparent fill, 12.5px/600, `px-3 py-1.5`, `hover:bg-band` — the `Show every type` reset.

### Quiet Links
Text-only, 12.5px/600, `ink-soft → ink` on hover. `Full page`, `On Maps`, and `Place on Google Maps` are underlined with `decoration-rule-strong` at `underline-offset-4`; `All places` sits on a 16px authored back-arrow SVG.

### Travel Mode (shared control)
- **Shape:** a 2px-padded frame (`rule-strong` hairline, 6px radius) holding two 4px-radius segments; `role="group"`, `aria-label="Travel mode"`.
- **State:** the active segment is `ink` fill with `paper` text and `aria-pressed="true"`; the inactive segment is `ink-soft`, `hover:text-ink`. This is a real control, so it takes **ink** as its selection language rather than the Line's accent — the accent belongs to the corridor, not to a segmented control.

### Type Filter (input)
- **Style:** `paper` fill, 1px `rule-strong`, 6px radius, 12.5px/500 `ink`, `py-1.5 pl-2.5 pr-2`; a 12.5px/500 `ink-soft` `Type` label sits beside it. Focus uses the global Line-coloured ring. Options carry `(n)` counts from the data; the select appears on the Browse page only.

### Station Band & Place Row
- **Station Band:** the warm-grey heading strip for a stop that carries Places — `band` fill, `py-2.5 pl-[52px] pr-4`, a 12px/700 uppercase 0.1em `ink` name and a 12px `tabular-nums` `ink-soft` Place count.
- **Place Row:** a full-width button, `py-3 pl-[52px] pr-12`, `hover:bg-band`; a 13.5px/600 `ink` name over a 12px `ink-soft` `kind · type` meta. The selected state is a `color-mix` tint from `--line-accent` (8% at rest, 12% on hover) plus a filled marker — never a side-tab. A trailing 15px authored `OpenIcon` link sits at `right-2`.

### Corridor Spine & Stop Marker (signature)
The corridor is the site's identity: one vertical 2px spine at `left-[22px]` running the whole list, stepping with each stop. Stops with Places take the Line accent spine and a 14px filled accent marker (`rounded-full`, 2px ring), and carry a `band` heading plus their Place rows. Stops with no Places take a `rule-strong` spine and an unfilled `paper` marker ring, and render one compact non-interactive line ending in `No places yet`. The final row's spine is truncated to 30px so the corridor ends cleanly. Everything about the corridor is derived from the data: stop order, which stops hold Places, and the colour — the page proves its coverage instead of claiming it.

### Coverage Diagram (signature)
Before a Place is picked, the Browse map column shows the whole corridor at scale: a `rule-strong` `rounded-full` track, the run of stops with Places filled in `--line-accent` to a width derived from that count, one marker per stop (accent-filled when it holds Places, `paper`-ringed when not), and the two 16px endpoint names beneath. It is decorative to assistive tech (`aria-hidden`) because the same facts are stated in text.

### Route Strip & Route Frame
- **Route Strip:** a `shrink-0 border-t border-rule` bar at the foot of the map column — `paper`, `px-4 py-3`, `flex-wrap gap-x-5 gap-y-3`. On the Browse page at rest it reads `Pick a place from the corridor — its walk or drive route appears here.`; once a Place is selected it carries `All places`, the Place name (13.5px/600) over its `kind · type · station` meta (12.5px `ink-soft`), the shared `TravelMode`, `Open route`, `Full page`, and `On Maps`. Its content arrives with the 420ms `app-reveal` (opacity + 6px rise, `cubic-bezier(0.16, 1, 0.3, 1)`; disabled under reduced motion). The Place page's strip is the same bar holding `TravelMode`, `Open route`, and `Place on Google Maps`.
- **Route Frame:** the embedded Google Maps iframe, built client-side from a Place's coordinates and its nearest station in walk or drive mode. It fills its box (`absolute inset-0`, border-0) on Browse, and is `h-[52vh]` on a phone / `md:flex-1` on the Place page. It cannot be styled, read, or clicked into, and nothing is laid over it.

### Contribute Column
The `Contribute a place` display heading sits in a `max-w-[640px]` column, with the site's own native form beneath it. The form is built from the same controls and tokens as every other surface; nothing on it is a third-party frame.

### Icons
Every icon is an authored single-stroke SVG in `app/components/icons.tsx` (`OpenIcon`, `BackIcon`, 1.5px stroke, `currentColor`, 15–16px) — never a Unicode arrow standing in for an icon.

## Do's and Don'ts

### Do:
- **Do** set the accent once, from the data, via `--line-accent` on the root of each page, and read it as `var(--line-accent, var(--color-ink))`.
- **Do** express the Line's colour as a stripe, fill, marker, diagram run, tint, or focus ring.
- **Do** separate structure with 1px `rule`/`rule-strong` hairlines and `paper`-against-`band` tone.
- **Do** use Archivo only, with `tabular-nums` on every count, ratio, and station code.
- **Do** state the stops with no Places plainly and derive every count and name from the data (`coverage()` / `coverageCopy()`).
- **Do** keep a visible focus ring on every interactive element — `2px` accent at `2px` offset.
- **Do** keep the route strip a sibling *below* the map, behind a `border-t`, so the route frame is never covered.
- **Do** share the chrome — `AppBar`, `TravelMode`, and the authored icons — across surfaces rather than rebuilding it per page.
- **Do** hand back focus explicitly when a control unmounts (map-on-mobile select, and clear-selection), rather than letting it fall to `<body>`.

### Don't:
- **Don't** use a Line's colour as text; four of the network's eight Line colours fail AA as text on white, and the shipped `#ed0f4c` is large-text-only at 4.18:1 on paper.
- **Don't** introduce a second accent, a per-type hue, or a hand-picked selected-row colour.
- **Don't** add a shadow anywhere or wrap rows and regions in cards; the world is flat and separates by tone and rule alone.
- **Don't** put a Line's accent on a control — `TravelMode`, buttons, and the selected segment use ink as the selection language.
- **Don't** reintroduce the `border-l-4` side-tab as a selection marker; use the tint plus filled marker.
- **Don't** reintroduce Inter, a Google Fonts link, or any second type family, and don't add a seventh type size; reuse one of the six steps.
- **Don't** overlay the map with a strip or anything else; the frame sits in its own box with the strip below it.
- **Don't** use a raster in the interface, and don't invent provenance for one. The only rasters that ship are the favicon set; the source photograph is a build input under `assets/`, never a page asset.
- **Don't** show a walk or drive time figure; no page carries a Measurement, and the map route is the answer.
- **Don't** use a `↗`/`←` text glyph as an icon; use the authored SVG.
- **Don't** flatten the coverage fact into a single claim — the stops with no Places are shown and named, never implied away.
