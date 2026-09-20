---
name: NaikTrainJer — Browse page
description: Warm-paper, near-black-ink corridor system for the Browse page, with the Line's own colour carried as spine and marker, never as text.
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
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  row-title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 600
    lineHeight: 1.4
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
  md: "8px"
  pill: "9999px"
spacing:
  hairline: "2px"
  tight: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
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
    typography: "{typography.label}"
  primary-button-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  quiet-link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    padding: "4px"
  station-band:
    backgroundColor: "{colors.band}"
    textColor: "{colors.ink}"
    padding: "10px 16px 10px 52px"
  place-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "12px 48px 12px 52px"
  place-row-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  travel-mode:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "2px"
  map-strip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: NaikTrainJer — Browse page

## Overview

**Creative North Star: "The Corridor Itself"**

The Browse page does not present a directory that happens to list stations. It *is* the corridor: one Line, every stop on it, drawn south to north as a single continuous spine, with checked stops carrying their Places and the unchecked tail still visible and named. The visual world serves that fact and nothing else. A warm near-white paper ground replaces the incumbent white card on slate; near-black ink replaces slate text; hairline rules and a warm-grey stop band replace card edges and shadows. The Line's own colour — read from the data, never written into the stylesheet — is the only accent, and it appears as a spine, a filled marker, a selected-row tint, and the focus ring. It is never used as text.

The face is **Archivo**, self-hosted as a variable font (weight 400–700, three `unicode-range` subsets), a signage grotesque with the tabular figures a page of stop counts and station codes needs. Density is high and deliberate: an app shell holds two columns edge to edge, and the map column's foot carries a single strip that reads as an instruction until a Place is picked, then answers with the route controls. Separation comes from tone (paper against band) and from 1px rules; exactly one soft offset shadow exists in the entire surface, and it sits under that map strip because the strip genuinely lifts off the map. There are no other cards, no other shadows, and no raster imagery of any kind.

Motion is almost absent: hover and focus shifts are ordinary colour transitions, and one authored moment — the map strip's content arriving rather than blinking in — runs at 420ms and is disabled under `prefers-reduced-motion`.

**Key Characteristics:**
- One Line, one corridor; line order is the only order ever shown.
- Warm paper (`#faf9f7`) ground, near-black ink (`#15171c`) text, hairline rules.
- A single data-driven accent: the Line's colour, as spine, marker, tint, and focus ring — never text.
- Separation by tone and rule, not by cards; one soft offset shadow, on the map strip only.
- Archivo throughout, tabular numerals for counts and station codes.
- No raster assets ship; the only binaries are the three Archivo woff2 subsets.

### Scope — the world is one surface

This is a **scoped world, on purpose**, and the boundary is load-bearing. Everything in this document governs **the Browse page (`app/routes/browse.tsx`) only**, under the `.browse-app` scope in `app/app.css`, plus the `@theme` tokens named below (`--color-paper`, `--color-band`, `--color-ink`, `--color-ink-soft`, `--color-rule`, `--color-rule-strong`, `--font-browse`).

The **Place page (`app/routes/place.tsx`)** and the **Submit page (`app/routes/submit.tsx`)** keep the earlier world and are **not** governed here: Inter from Google Fonts, `slate`/`sky` Tailwind colours, white `rounded-2xl` cards on `slate-50` with `shadow-sm`, a `sky-500` global focus ring, and literal `↗`/`←` text glyphs. The global `@layer base` block in `app/app.css` (body background `--color-slate-50`, body text `--color-slate-800`, `--font-sans: Inter`, the `sky-500` `:focus-visible` ring) is that **old world** and stays as it is; the `.browse-app` block overrides only what is inside its scope. A future agent must not extend the `.browse-app` tokens or rules onto the Place or Submit pages without an explicit identity change for those surfaces.

### Known and unresolved

The coverage fact is stated three times within the first viewport of the Browse page: (1) the app bar's `22 of 37 stations · 84 places`, (2) the corridor header's coverage paragraph (`I've checked 22 of the 37 stations so far …`), and (3) the map column's `How far I've got` heading with its `22 of 37 stops checked · 15 still to do` line. This repetition is **known and deliberately left for a future copy pass**; it is recorded here rather than silently omitted so no future edit mistakes it for an intended pattern.

## Colors

The palette is a warm neutral quartet plus one loud, data-owned accent. Nothing is cool, nothing is pure white, and the accent is never chosen by hand.

### Primary
- **Line Accent** (`#ed0f4c`, today the Kelana Jaya Line's own colour): **read from `data/properties.json` at runtime** and set as `--browse-accent` on the `.browse-app` root — it is never hardcoded in the stylesheet. Used as the corridor spine over checked stops, the filled stop marker, the `color-mix` tint on the selected row (8% at rest, 12% on hover), the `::selection` wash (24%), and the focus ring. **Never used as text.**

### Neutral
- **Warm Paper** (`#faf9f7`): the page ground, the map-strip surface, the unfilled stop marker's fill, and the base that all tints mix into.
- **Stop Band** (`#f1efeb`): the tone behind checked station headings and the map column's backdrop; the hover wash on list rows and on the "Show every type" button. Separation without a card.
- **Ink** (`#15171c`): primary text, the primary button's fill, the travel-mode active segment's fill. **17.04:1 on paper.**
- **Ink Soft** (`#5c5f66`): secondary text — row meta, coverage paragraph, unchecked-station names, quiet links. **6.08:1 on paper** — clears AA at body size.
- **Rule** (`#e6e2db`): the default 1px hairline between regions and rows.
- **Rule Strong** (`#d5d0c7`): the stronger hairline on interactive edges (select, travel-mode frame, quiet button), the unfilled spine and marker, scrollbar thumb, and underline decoration.

### Named Rules
**The Line-Is-Never-Text Rule.** The Line's colour is a stripe, a fill, a marker, or a ring — never a glyph or a word. On white, `#ed0f4c` measures **4.18:1** (large text only), and the network reference carries eight Line colours of which four fail AA as text on white. A Line's colour cannot be relied on to carry meaning as text, so it never does.

**The One Accent Rule.** Exactly one accent exists on the surface, and it comes from the data. Do not introduce a second brand colour, a per-type hue, or a hand-picked highlight; the selected row is tinted from `--browse-accent`, not from a fixed yellow or blue.

**The Data-Owns-The-Colour Rule.** The accent is `--browse-accent`, defaulting to Ink when unset (`var(--browse-accent, var(--color-ink))`). A second Line is a data change; the stylesheet must not need editing.

## Typography

**Display Font:** Archivo (with `system-ui, sans-serif` fallback), self-hosted variable 400–700 as three `woff2` subsets under `public/fonts/`.
**Body Font:** Archivo — the same face; this world uses one family only.

**Character:** A signage grotesque doing directory work. Tight negative tracking at display sizes, uppercase wide tracking on small labels, and tabular figures wherever a count or station code appears. The single face keeps the corridor feeling like one continuous strip rather than a stack of components.

### Hierarchy
- **Display** (700, 26px → 36px at `sm`, line-height 1.05, letter-spacing −0.03em): the map column's `How far I've got` heading — the one large statement on the surface.
- **Title** (600, 16px, line-height 1.2, letter-spacing −0.01em): the corridor diagram's endpoint names (south and north).
- **Row Title** (600, 13.5px): a Place's name in the corridor list.
- **Body** (400, 12.5px, line-height 1.625): the coverage paragraph, the map strip's instruction and route metadata.
- **Label** (700, 12px, letter-spacing 0.1em, uppercase): station headings in the corridor band. A wide-tracked uppercase label is the only uppercase treatment used; small letter-spaced labels are the vocabulary for "this names a group", not decoration.

Counts, station codes, and coverage ratios render with `tabular-nums` so digits do not jitter as the list filters.

### Named Rules
**The One Face Rule.** The Browse surface uses Archivo and nothing else. Do not introduce a display face, a serif, a mono, or a second grotesque; tabular figures supply the numeric texture that a mono would otherwise provide.

**The Tabular Figures Rule.** Any number the visitor compares — station counts, coverage ratios, stop totals — is set in tabular numerals, never proportional.

## Layout

The surface is an app shell, full height (`h-dvh`) and non-scrolling at the root; each column scrolls inside itself. An app bar spans the top, separated by a 1px `rule` bottom border and wrapping freely on narrow screens (`flex-wrap`, `gap-x-5`/`gap-y-2.5`, `px-4 py-3` → `sm:px-6`). Below it, two columns sit edge to edge: the corridor list (`w-[420px]`, `shrink-0`, `border-r`) and the map column (`flex-1`). The split appears at `md` (768px); below that the two columns are mutually exclusive — the corridor fills the screen, and selecting a Place swaps in the map column (the corridor is `hidden md:flex` when a Place is selected, otherwise `flex`).

The corridor's rhythm is a fixed left rail of 52px (`pl-[52px]`) carrying the spine and stop markers, so names and counts align down the whole list. Station headings sit on a `band` strip with `py-2.5`; Place rows run `py-3` with `pr-12` to clear the trailing page-link icon; unchecked rows are a compact `py-2` line. The corridor header (`px-5 pb-3.5 pt-4`) carries the Line's identity and the coverage paragraph.

The map column is `bg-band`, with the map frame absolutely filling the region and a strip pinned at its foot (`absolute inset-x-0 bottom-0 p-3`). The strip holds the state line plus, once a Place is selected, the travel-mode toggle and actions (`flex-wrap`, `gap-x-5 gap-y-3`).

Spacing is a 4px-based rhythm; the recurring steps are 2, 4, 6, 8, 12, 16, 20, 28, 48px. Corridor diagram stops widen from 14px to 18px at `min-[1400px]` so the spine stays proportionate on a wide monitor.

### Named Rules
**The Corridor Order Rule.** Line order — descending `sort`, south to north — is the only order the corridor is ever shown in. There is no A–Z sort and no "most places" sort; the corridor is real information, not a sort option.

**The Rule-Not-Card Rule.** Regions and rows are separated by 1px rules and by tone (paper against band), never by cards, borders-on-all-sides, or shadows. The map strip is the single exception, and only because it floats over the map.

## Elevation & Depth

This system is **flat by default**. Depth is conveyed by tonal layering — `paper` against `band` — and by hairline rules. Exactly **one** shadow exists on the entire surface, under the map strip, where the strip genuinely sits above the map and must read as lifted. Nothing else is elevated: rows, station bands, the app bar, the travel-mode control, and the corridor diagram are all flat.

### Shadow Vocabulary
- **Map Strip Lift** (`box-shadow: 0 1px 2px rgba(21,23,28,0.05), 0 10px 28px -14px rgba(21,23,28,0.22)`): the map strip only. A tight contact shadow plus a wide, low-opacity cast, both tinted from Ink rather than pure black.

### Named Rules
**The One Shadow Rule.** A second shadow is a defect, not a variation. If a new element needs to feel raised, it should instead be re-thought as tone or rule; the map strip's shadow is licensed by the fact that it overlays a moving map.

## Shapes

The form language is quiet and functional. Containers and controls take small radii: **6px** (`rounded-md`) on the type filter, primary buttons, and the travel-mode frame; **8px** (`rounded-lg`) on the map strip; **4px** on the travel-mode's active segment and the trailing icon button; a bare **4px** radius on the back button's hit area. The corridor is **round**: the spine is a 2px `rounded-full` stroke, stop markers are perfect circles (14px, 18px at `min-[1400px]`), and the selected-row marker is a filled circle. Borders are always hairlines — 1px `rule` for structure, 1px `rule-strong` for interactive edges, 2px for the spine, and a 2px ring on an unfilled stop marker (3–4px on the oversized diagram marker). There is no clipping, no thick side-tab, and no decorative geometry; the only circles belong to the corridor.

### Named Rules
**The Hairline Rule.** Structure is drawn with 1px rules. A 2px line is reserved for the corridor spine; anything thicker is a defect. The old world's `border-l-4` side-tab must not reappear here — the selected row is signalled by a tint plus a filled marker, never by a thick edge.

## Components

### App Bar
- **Shape:** full-width, flat, 1px `rule` bottom border; no radius, no shadow.
- **Contents:** the `NaikTrainJer` wordmark (15px, 700, −0.03em), the type filter, the coverage counts line (`ml-auto`, 12.5px, `tabular-nums`, `ink-soft`, hidden below `sm`), and the `Suggest a place` primary button.
- **Behavior:** wraps on narrow screens; the counts line drops below `sm`, then the button follows the filter.

### Buttons
- **Shape:** 6px radius.
- **Primary:** `ink` fill, `paper` text, 13px/600, `px-3 py-1.5`; used for `Suggest a place` and `Open route`.
- **Hover / Focus:** `hover:opacity-85` with a colour/opacity transition; focus takes the `.browse-app` ring — `2px` `--browse-accent` at `2px` offset (falling back to Ink).
- **Quiet button:** `rule-strong` hairline, transparent fill, 12.5px/600, `px-3 py-1.5`, `hover:bg-band` — the `Show every type` reset.
- **Ghost / link:** text-only, `ink-soft → ink` on hover. `Full page` and `On Maps` are underlined with `decoration-rule-strong` at `underline-offset-4`; `All places` sits with a 15px authored back-arrow SVG.

### Chips / Segmented
- **Travel Mode:** a 2px-padded frame (`rule-strong` hairline, 6px radius) holding two 4px-radius segments. Active segment is `ink` fill with `paper` text; inactive is `ink-soft`, `hover:text-ink`. `aria-pressed` marks the active mode. This is a real control, so it is not tinted with the Line accent — ink is the selection language for controls.

### Cards / Containers
- **Corner Style:** the system has no cards; the one container is the **Map Strip** (8px radius, `paper`, 1px `rule` border, the sole shadow).
- **Internal Padding:** strip `px-4 py-3`; station band `py-2.5 pl-[52px] pr-4`; Place row `py-3 pl-[52px] pr-12`.

### Inputs / Fields
- **Type Filter (select):** `paper` fill, 1px `rule-strong`, 6px radius, 13px/500 ink, `py-1.5 pl-2.5 pr-2`; a 12.5px/500 `ink-soft` "Type" label sits beside it. Focus uses the scoped Line-coloured ring. Options carry `(n)` counts from the data.

### Navigation
- **Style:** the app bar is the only navigation chrome; the wordmark is text, not an image. Trailing page links in each Place row are 15px authored single-stroke SVG icons in an `ink-soft → ink` hover with a `paper` hover chip. The map strip's `All places` button is the in-surface back control.
- **Mobile treatment:** selecting a Place replaces the corridor with the map column and moves keyboard focus to `All places` (so focus never falls to `<body>`); clearing a Place returns focus to the originating row.

### Signature: The Corridor
The corridor is the page's identity: one vertical spine (`left-[22px]`, 2px wide) running the whole list, stepping with each stop. Checked stops take the Line accent spine and a filled accent marker, and carry a `band` heading with a count plus their Place rows. Unchecked stops take a `rule-strong` spine and an unfilled `paper` marker ring, and render one compact non-interactive line ending in `Not checked yet`. The final row's spine is truncated to 30px so the corridor ends cleanly. Everything about the corridor is derived from the data: stop order, which stops are checked, and the colour — the page proves its coverage instead of claiming it.

### Signature: The Coverage Diagram
Before a Place is picked, the map column shows the whole corridor at scale: a full-width `rule-strong` track, the checked run filled in `--browse-accent` to a width derived from the checked count, one marker per stop (accent-filled when checked, `paper`-ringed when not), and the two endpoint names beneath. It is decorative to assistive tech (`aria-hidden`) because the same facts are stated in text.

### Signature: The Map Strip
The strip at the map's foot is the surface's one lifted element and its one authored motion. At rest it reads `Pick a place from the corridor — its walk or drive route appears here.` Once a Place is selected, its content arrives with the 420ms `browse-reveal` (opacity + 6px rise, `cubic-bezier(0.16, 1, 0.3, 1)`; disabled under reduced motion) and carries the Place name, its `metaLabel · station`, the travel-mode toggle, `Open route`, `Full page`, and `On Maps`.

## Do's and Don'ts

### Do:
- **Do** set the accent once, from the data, via `--browse-accent` on the `.browse-app` root, and read it as `var(--browse-accent, var(--color-ink))`.
- **Do** express the Line's colour as a stripe, fill, marker, tint, or focus ring.
- **Do** separate structure with 1px `rule`/`rule-strong` hairlines and `paper`-against-`band` tone.
- **Do** use Archivo only, with `tabular-nums` on every count, ratio, and station code.
- **Do** state the unchecked corridor plainly and derive every count, name, and stretch from the data (`coverage()` / `coverageCopy()`).
- **Do** keep a visible focus ring on every interactive element — `2px` accent at `2px` offset within `.browse-app`.
- **Do** hand back focus explicitly when a control unmounts (map-on-mobile select, and clear-selection), rather than letting it fall to `<body>`.
- **Do** keep icons as authored single-stroke inline SVG when an icon is needed.

### Don't:
- **Don't** use a Line's colour as text; four of the network's eight Line colours fail AA as text on white, and the shipped `#ed0f4c` is large-text-only at 4.18:1 on paper.
- **Don't** introduce a second accent, a per-type hue, or a hand-picked selected-row colour.
- **Don't** add a second shadow or wrap rows and regions in cards; the map strip's shadow is the only elevation.
- **Don't** extend these tokens or rules to the Place or Submit pages, and don't alter the global `@layer base` block — that is the old world and stays.
- **Don't** reintroduce the `border-l-4` side-tab as a selection marker; use the tint plus filled marker.
- **Don't** use Inter or any system display face on this surface, and don't add a second type family.
- **Don't** ship raster assets or invent provenance for them; the Browse page ships no illustrations, photographs, or textures — the only binaries are the three Archivo `woff2` subsets.
- **Don't** show a walk or drive time figure; no page carries a Measurement, and the map route is the answer.
- **Don't** use a `↗`/`←` text glyph as an icon on this surface; use the authored SVG.
- **Don't** flatten the coverage fact into a single claim — the unchecked stretch is shown and named, never implied away.
