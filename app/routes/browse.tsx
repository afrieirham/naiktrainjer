import { useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData, useSearchParams } from "react-router";
import {
  buildStationRows,
  filterPlaces,
  getUniqueTypes,
} from "../lib/browse-filter";
import {
  coveredLine,
  coveredLines,
  corridorOrder,
  coverage,
  coverageCopy,
  selectedLine,
  stationNamesByCode,
  type Coverage,
  type Line,
} from "../lib/lines";
import { lines as LINES, places as PLACES } from "../data/directory";
import {
  buildRouteFrameUrl,
  buildOpenRouteUrl,
  type RouteMode,
} from "../lib/route-url";
import { RouteFrame } from "../components/RouteFrame";
import { AppBar, AppBarAction } from "../components/AppBar";
import { TravelMode } from "../components/TravelMode";
import { OpenIcon, BackIcon } from "../components/icons";
import { TYPE_LABELS, metaLabel } from "../lib/labels";
import { publicUrl } from "../lib/routes";
import type { Route } from "./+types/browse";

export function loader() {
  return {
    places: PLACES,
  };
}

/**
 * Every Line and Place is bundled, so the selected Line comes out of the data
 * rather than a request. Skipping revalidation keeps a `?line=` switch a pure
 * client-side render — there is no `.data` request to make on a static host.
 */
export function shouldRevalidate() {
  return false;
}

/**
 * The site's own page. The root layout no longer hardcodes a title or description,
 * so every route must supply its own — otherwise a page ships with no metadata at all.
 * The Line's name comes from the data, so a second Line is a data change, not a copy change.
 */
export const meta: Route.MetaFunction = () => {
  const line = coveredLine(LINES, PLACES);
  return [
    { title: `NaikTrainJer — places near stations on the ${line.name} line` },
    {
      name: "description",
      content: `Browse ${PLACES.length} places near stations on the ${line.name} line, in the line's own order. Walk or drive directions to the station.`,
    },
    { tagName: "link", rel: "canonical", href: publicUrl("/") },
  ];
};

/**
 * What the map column holds before a Place is picked: the corridor itself, at
 * scale. Every stop, name and count comes from the data, so the Stations that
 * hold Places are as legible as the ones that do not — the page proves its
 * coverage instead of claiming it.
 */
function EmptyCorridor({ line, cov }: { line: Line; cov: Coverage }) {
  const stops = corridorOrder(line);
  const coveredCodes = new Set(cov.covered.map((station) => station.code));
  const span = stops.length - 1;
  const boundary = span > 0 ? ((cov.coveredCount - 1) / span) * 100 : 0;
  const south = stops[0];
  const north = stops[stops.length - 1];

  return (
    <div className="flex h-full flex-col justify-center px-6 py-10 sm:px-12">
      <h2 className="max-w-[22ch] text-[26px] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[34px]">
        How far I&rsquo;ve got
      </h2>
      <p className="mt-4 text-[13.5px] font-medium tabular-nums text-ink-soft">
        {cov.coveredCount} of {cov.total} stops have places · {cov.empty.length} with no
        places yet
      </p>

      <div className="relative mt-12 h-[14px] min-[1400px]:h-[18px]">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full"
          style={{ backgroundColor: "var(--color-rule-strong)" }}
        />
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full"
          style={{ width: `${boundary}%`, backgroundColor: "var(--line-accent)" }}
        />
        {stops.map((stop, index) => {
          const isCovered = coveredCodes.has(stop.code);
          const position = span > 0 ? (index / span) * 100 : 0;
          return (
            <span
              key={stop.code}
              aria-hidden="true"
              className="absolute top-0 h-[14px] w-[14px] -translate-x-1/2 rounded-full border-[3px] min-[1400px]:h-[18px] min-[1400px]:w-[18px] min-[1400px]:border-[4px]"
              style={{
                left: `${position}%`,
                borderColor: isCovered ? "var(--line-accent)" : "var(--color-rule-strong)",
                backgroundColor: isCovered ? "var(--line-accent)" : "var(--color-paper)",
              }}
            />
          );
        })}
      </div>

      <div className="mt-7 flex items-baseline justify-between gap-6">
        <span className="truncate text-[16px] font-semibold tracking-[-0.01em] text-ink">
          {south?.name}
        </span>
        <span className="truncate text-[16px] font-semibold tracking-[-0.01em] text-ink">
          {north?.name}
        </span>
      </div>
    </div>
  );
}

export default function Browse() {
  const { places } = useLoaderData<typeof loader>();

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [routeMode, setRouteMode] = useState<RouteMode>("walk");
  const [searchParams, setSearchParams] = useSearchParams();

  /**
   * The URL is the source of truth for the selected Line, but a static host
   * serves the one page prerendered for `/` — the default Line. Reading the
   * param on the first client render would mismatch that HTML, so it is applied
   * once mounted: the first paint matches what was served, then a shared or
   * refreshed `?line=` takes over.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const covered = useMemo(() => coveredLines(LINES, places), [places]);
  const defaultLine = useMemo(() => coveredLine(LINES, places), [places]);
  const line = useMemo(
    () => selectedLine(LINES, places, mounted ? searchParams.get("line") : null),
    [places, searchParams, mounted],
  );

  /** Only the selected Line's Places sit on the corridor. */
  const linePlaces = useMemo(() => {
    const codes = new Set(line.stations.map((station) => station.code));
    return places.filter((place) => codes.has(place.station));
  }, [line, places]);

  const uniqueTypes = useMemo(() => getUniqueTypes(linePlaces), [linePlaces]);
  const cov = useMemo(() => coverage(line, places), [line, places]);

  const stationNameMap = useMemo(() => stationNamesByCode(LINES), []);

  const filteredPlaces = useMemo(
    () => filterPlaces(linePlaces, typeFilter),
    [linePlaces, typeFilter],
  );

  const stationRows = useMemo(
    () => buildStationRows(line, linePlaces, filteredPlaces),
    [line, linePlaces, filteredPlaces],
  );

  const selectedPlace = useMemo(
    () => linePlaces.find((p) => p.slug === selectedSlug) ?? null,
    [linePlaces, selectedSlug],
  );

  /**
   * Switching Lines is a client-side render: the choice goes in the URL so
   * Back, refresh and sharing all restore it. The default Line keeps a bare
   * `/`; an unknown slug never reaches here because `selectedLine` resolves it.
   */
  const selectLine = (slug: string) => {
    const next = new URLSearchParams(searchParams);
    if (!slug || slug === defaultLine.slug) next.delete("line");
    else next.set("line", slug);
    setSearchParams(next);
    setSelectedSlug(null);
  };

  const selectedStationName = selectedPlace
    ? stationNameMap.get(selectedPlace.station) ?? selectedPlace.station
    : null;

  const selectedAlsoNear = useMemo(() => {
    if (!selectedPlace?.alsoNear?.length) return [];
    return selectedPlace.alsoNear.map((code) => stationNameMap.get(code) ?? code);
  }, [selectedPlace, stationNameMap]);

  const routeFrameUrl = useMemo(() => {
    if (!selectedPlace || !selectedStationName) return "";
    return buildRouteFrameUrl(selectedPlace, selectedStationName, routeMode);
  }, [selectedPlace, selectedStationName, routeMode]);

  const openRouteUrl = useMemo(() => {
    if (!selectedPlace || !selectedStationName) return "";
    return buildOpenRouteUrl(selectedPlace, selectedStationName, routeMode);
  }, [selectedPlace, selectedStationName, routeMode]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const place of linePlaces) counts.set(place.type, (counts.get(place.type) ?? 0) + 1);
    return counts;
  }, [linePlaces]);

  const nothingMatches = filteredPlaces.length === 0;
  const lastIndex = stationRows.length - 1;

  /**
   * On a phone the route replaces the corridor, so the row that was just activated
   * leaves the tree. Without this, focus falls to <body> and the change is silent.
   */
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!selectedSlug) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    backRef.current?.focus();
  }, [selectedSlug]);

  /**
   * Clearing unmounts the control that was just used, so focus is handed back to
   * the row it came from rather than dropped on <body>.
   */
  const clearFocusRef = useRef<string | null>(null);
  const clearSelection = () => {
    clearFocusRef.current = selectedSlug;
    setSelectedSlug(null);
  };
  useEffect(() => {
    const slug = clearFocusRef.current;
    if (selectedSlug !== null || !slug) return;
    clearFocusRef.current = null;
    document
      .querySelector<HTMLButtonElement>(`[data-place-slug="${slug}"]`)
      ?.focus();
  }, [selectedSlug]);

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden"
      style={{ "--line-accent": line.color } as React.CSSProperties}
    >
      <AppBar
        counts={`${cov.coveredCount} of ${cov.total} stations · ${linePlaces.length} places`}
        action={<AppBarAction href="/submit/">Suggest a place</AppBarAction>}
      />

      <div className="flex min-h-0 flex-1">
        {/* The corridor */}
        <section
          aria-label="Places along the line"
          className={`min-h-0 w-full flex-col border-rule md:flex md:w-[420px] md:shrink-0 md:border-r ${
            selectedPlace ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="shrink-0 border-b border-rule px-4 pb-3.5 pt-3.5 sm:px-5 sm:pt-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h1 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
                {line.name} line
              </h1>
              <div className="flex min-w-0 items-center gap-2">
                <select
                  id="line-selector"
                  aria-label="Line"
                  value={line.slug}
                  onChange={(event) => selectLine(event.target.value)}
                  className="min-w-0 rounded-md border border-rule-strong bg-paper py-1 pl-2 pr-1.5 text-[12.5px] font-medium text-ink"
                >
                  {covered.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <select
                  id="type-filter"
                  aria-label="Type"
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value);
                    setSelectedSlug(null);
                  }}
                  className="min-w-0 rounded-md border border-rule-strong bg-paper py-1 pl-2 pr-1.5 text-[12.5px] font-medium text-ink"
                >
                  <option value="">All types</option>
                  {uniqueTypes.map((type) => (
                    <option key={type} value={type}>
                      {TYPE_LABELS[type] ?? type} ({typeCounts.get(type) ?? 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
              {coverageCopy(cov)}
            </p>
          </div>

          {nothingMatches ? (
            <div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-3 px-6">
              <p className="text-[13.5px] text-ink-soft">
                No places match that type.
              </p>
              <button
                type="button"
                onClick={() => setTypeFilter("")}
                className="rounded-md border border-rule-strong px-3 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:bg-band"
              >
                Show every type
              </button>
            </div>
          ) : (
            <ol className="app-scroll min-h-0 flex-1 overflow-y-auto">
              {stationRows.map((row, index) => {
                const covered = row.count > 0;
                const isLast = index === lastIndex;

                return (
                  <li
                    key={row.code}
                    role={covered ? "group" : undefined}
                    aria-label={covered ? row.name : undefined}
                    data-station-count={covered ? row.count : undefined}
                    className="relative"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute left-[22px] top-0 z-10 w-[2px]"
                      style={{
                        bottom: isLast ? "auto" : 0,
                        height: isLast ? "30px" : undefined,
                        backgroundColor: covered
                          ? "var(--line-accent)"
                          : "var(--color-rule-strong)",
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute left-[16px] top-[14px] z-20 h-[14px] w-[14px] rounded-full border-2"
                      style={{
                        borderColor: covered
                          ? "var(--line-accent)"
                          : "var(--color-rule-strong)",
                        backgroundColor: covered
                          ? "var(--line-accent)"
                          : "var(--color-paper)",
                      }}
                    />

                    {covered ? (
                      <>
                        <div className="bg-band py-2.5 pl-[52px] pr-4">
                          <div className="flex items-baseline justify-between gap-3">
                            <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink">
                              {row.name}
                            </h2>
                            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-ink-soft">
                              {row.count}
                            </span>
                          </div>
                        </div>
                        <ul>
                          {row.places.map((place) => {
                            const isActive = place.slug === selectedSlug;
                            return (
                              <li key={place.slug} role="listitem">
                                <button
                                  type="button"
                                  data-place-slug={place.slug}
                                  data-active={isActive}
                                  aria-current={isActive ? "true" : undefined}
                                  onClick={() =>
                                    isActive
                                      ? clearSelection()
                                      : setSelectedSlug(place.slug)
                                  }
                                  className="corridor-row flex w-full items-center py-3 pl-[52px] pr-4 text-left transition-colors hover:bg-band"
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[13.5px] font-semibold text-ink">
                                      {place.name}
                                    </span>
                                    <span className="mt-0.5 block truncate text-[12px] text-ink-soft">
                                      {metaLabel(place)}
                                    </span>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    ) : (
                      <div
                        data-station-code={row.code}
                        data-station-empty="true"
                        className="flex items-baseline justify-between gap-3 py-2 pl-[52px] pr-4"
                      >
                        <span className="truncate text-[13.5px] font-medium text-ink-soft">
                          {row.name}
                        </span>
                        <span className="shrink-0 text-[12px] text-ink-soft">
                          No places yet
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* The map, and the strip that answers */}
        <section
          aria-label="Place details"
          className={`min-h-0 flex-1 flex-col bg-band ${
            selectedPlace ? "flex" : "hidden md:flex"
          }`}
        >
          <div className="relative min-h-0 flex-1">
            {selectedPlace && routeFrameUrl ? (
              <RouteFrame
                src={routeFrameUrl}
                mode={routeMode}
                className="absolute inset-0 block h-full w-full border-0"
              />
            ) : (
              <EmptyCorridor line={line} cov={cov} />
            )}
          </div>

          {/* The strip sits below the map, never over it — an overlay would cover
              the frame and swallow Google's own map controls. */}
          <div className="shrink-0 border-t border-rule bg-paper px-3 py-3 sm:px-4 sm:py-3">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-x-5">
              {/*
                The answer has its own row so it has room to be read; the back
                control then sits with the other controls rather than stealing
                width from the name.
              */}
              <div className="min-w-0 sm:flex-1" aria-live="polite">
                <div
                  key={selectedPlace?.slug ?? "none"}
                  className="app-reveal"
                >
                  {selectedPlace ? (
                    <>
                      <p className="truncate text-[13.5px] font-semibold text-ink">
                        {selectedPlace.name}
                      </p>
                      <p className="mt-0.5 truncate text-[12.5px] text-ink-soft">
                        {metaLabel(selectedPlace)} · {selectedStationName}
                        {selectedAlsoNear.length > 0
                          ? ` · also near ${selectedAlsoNear.join(", ")}`
                          : ""}
                      </p>
                    </>
                  ) : (
                    <p className="text-[13.5px] text-ink-soft">
                      Pick a place from the corridor — its walk or drive route
                      appears here.
                    </p>
                  )}
                </div>
              </div>

              {selectedPlace && (
                <div className="app-reveal flex flex-wrap items-center gap-x-4 gap-y-2 sm:shrink-0">
                  <button
                    ref={backRef}
                    type="button"
                    onClick={clearSelection}
                    aria-label="All places"
                    title="All places"
                    className="-ml-1 inline-flex items-center gap-1.5 rounded px-1 py-1 text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-ink md:hidden"
                  >
                    <BackIcon />
                    {/* The label rides with the wider viewports; on a phone the
                        arrow plus `Google Maps` needs the room more. */}
                    <span className="hidden sm:inline">All places</span>
                  </button>
                  <TravelMode mode={routeMode} onChange={setRouteMode} />
                  <a
                    href={openRouteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft underline decoration-rule-strong underline-offset-4 transition-colors hover:text-ink"
                  >
                    Open in Google Maps
                    <OpenIcon size={13} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
