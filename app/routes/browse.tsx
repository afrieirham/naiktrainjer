import { useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData } from "react-router";
import propertiesData from "../../data/properties.json";
import {
  buildStationRows,
  filterPlaces,
  getUniqueTypes,
  type Place,
  type Station,
} from "../lib/browse-filter";
import { coveredLine, corridorOrder, coverage, coverageCopy, type Coverage, type Line } from "../lib/lines";
import {
  buildRouteFrameUrl,
  buildOpenRouteUrl,
  buildPlacePinUrl,
  type RouteMode,
} from "../lib/route-url";
import { RouteFrame } from "../components/RouteFrame";
import { TYPE_LABELS, metaLabel } from "../lib/labels";
import { publicUrl } from "../lib/routes";
import type { Route } from "./+types/browse";

const LINES = propertiesData.lines as Line[];
const CHECKED_STATIONS = propertiesData.stations as Station[];
const PLACES = propertiesData.places as Place[];

export function loader() {
  return {
    line: coveredLine(LINES, CHECKED_STATIONS),
    stations: CHECKED_STATIONS,
    places: PLACES,
  };
}

/**
 * The site's own page. The root layout no longer hardcodes a title or description,
 * so every route must supply its own — otherwise a page ships with no metadata at all.
 * The Line's name comes from the data, so a second Line is a data change, not a copy change.
 */
export const meta: Route.MetaFunction = () => {
  const line = coveredLine(LINES, CHECKED_STATIONS);
  return [
    { title: `NaikTrainJer — places near stations on the ${line.name} line` },
    {
      name: "description",
      content: `Browse ${PLACES.length} places I checked near stations on the ${line.name} line, in the line's own order. Walk or drive directions to the station.`,
    },
    { tagName: "link", rel: "canonical", href: publicUrl("/") },
  ];
};

/** Authored, one stroke weight, one style — never a Unicode arrow standing in for an icon. */
function OpenIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <path
        d="M6.25 3.5h6.25v6.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 3.5 3.5 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M13.25 8H2.75M7 3.75 2.75 8 7 12.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The travel mode, in the Browse page's own vocabulary. The Place page keeps the
 * shared `WalkDriveToggle`; this page's map owns a whole column and its controls
 * belong to that surface.
 */
function TravelMode({
  mode,
  onChange,
}: {
  mode: RouteMode;
  onChange: (mode: RouteMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Travel mode"
      className="inline-flex shrink-0 rounded-md border border-rule-strong p-[2px]"
    >
      {(
        [
          ["walk", "Walk"],
          ["drive", "Drive"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className={`rounded-[4px] px-2.5 py-1 text-[12.5px] font-semibold transition-colors ${
            mode === value ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * What the map column holds before a Place is picked: the corridor itself, at
 * scale. Every stop, name and count comes from the data, so the stretch still to
 * do is as legible as the stretch that is done — the page proves its coverage
 * instead of claiming it.
 */
function EmptyCorridor({ line, cov }: { line: Line; cov: Coverage }) {
  const stops = corridorOrder(line);
  const checkedCodes = new Set(cov.checked.map((station) => station.code));
  const span = stops.length - 1;
  const boundary = span > 0 ? ((cov.checkedCount - 1) / span) * 100 : 0;
  const south = stops[0];
  const north = stops[stops.length - 1];

  return (
    <div className="flex h-full flex-col justify-center px-6 py-10 sm:px-12">
      <h2 className="max-w-[22ch] text-[26px] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[36px]">
        How far I&rsquo;ve got
      </h2>
      <p className="mt-4 text-[14px] font-medium tabular-nums text-ink-soft">
        {cov.checkedCount} of {cov.total} stops checked · {cov.unchecked.length} still to do
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
          style={{ width: `${boundary}%`, backgroundColor: "var(--browse-accent)" }}
        />
        {stops.map((stop, index) => {
          const isChecked = checkedCodes.has(stop.code);
          const position = span > 0 ? (index / span) * 100 : 0;
          return (
            <span
              key={stop.code}
              aria-hidden="true"
              className="absolute top-0 h-[14px] w-[14px] -translate-x-1/2 rounded-full border-[3px] min-[1400px]:h-[18px] min-[1400px]:w-[18px] min-[1400px]:border-[4px]"
              style={{
                left: `${position}%`,
                borderColor: isChecked ? "var(--browse-accent)" : "var(--color-rule-strong)",
                backgroundColor: isChecked ? "var(--browse-accent)" : "var(--color-paper)",
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
  const { line, stations, places } = useLoaderData<typeof loader>();

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [routeMode, setRouteMode] = useState<RouteMode>("walk");

  const uniqueTypes = useMemo(() => getUniqueTypes(places), [places]);
  const cov = useMemo(() => coverage(line, stations), [line, stations]);

  const stationNameMap = useMemo(
    () => new Map(stations.map((s) => [s.slug, s.name])),
    [stations],
  );

  const filteredPlaces = useMemo(
    () => filterPlaces(places, typeFilter),
    [places, typeFilter],
  );

  const stationRows = useMemo(
    () => buildStationRows(line, stations, places, filteredPlaces),
    [line, stations, places, filteredPlaces],
  );

  const selectedPlace = useMemo(
    () => places.find((p) => p.slug === selectedSlug) ?? null,
    [places, selectedSlug],
  );

  const selectedStationName = selectedPlace
    ? stationNameMap.get(selectedPlace.station) ?? selectedPlace.station
    : null;

  const selectedAlsoNear = useMemo(() => {
    if (!selectedPlace?.alsoNear?.length) return [];
    return selectedPlace.alsoNear.map((slug) => stationNameMap.get(slug) ?? slug);
  }, [selectedPlace, stationNameMap]);

  const routeFrameUrl = useMemo(() => {
    if (!selectedPlace || !selectedStationName) return "";
    return buildRouteFrameUrl(selectedPlace, selectedStationName, routeMode);
  }, [selectedPlace, selectedStationName, routeMode]);

  const openRouteUrl = useMemo(() => {
    if (!selectedPlace || !selectedStationName) return "";
    return buildOpenRouteUrl(selectedPlace, selectedStationName, routeMode);
  }, [selectedPlace, selectedStationName, routeMode]);

  const placePinUrl = useMemo(() => {
    if (!selectedPlace) return "";
    return buildPlacePinUrl(selectedPlace);
  }, [selectedPlace]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const place of places) counts.set(place.type, (counts.get(place.type) ?? 0) + 1);
    return counts;
  }, [places]);

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
      className="browse-app flex h-dvh flex-col overflow-hidden"
      style={{ "--browse-accent": line.color } as React.CSSProperties}
    >
      <header className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2.5 border-b border-rule px-4 py-3 sm:px-6">
        <span className="text-[15px] font-bold tracking-[-0.03em] text-ink">
          NaikTrainJer
        </span>

        <div className="flex items-center gap-2">
          <label htmlFor="type-filter" className="text-[12.5px] font-medium text-ink-soft">
            Type
          </label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setSelectedSlug(null);
            }}
            className="rounded-md border border-rule-strong bg-paper py-1.5 pl-2.5 pr-2 text-[13px] font-medium text-ink"
          >
            <option value="">All types</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type] ?? type} ({typeCounts.get(type) ?? 0})
              </option>
            ))}
          </select>
        </div>

        <p className="ml-auto hidden text-[12.5px] tabular-nums text-ink-soft sm:block">
          {cov.checkedCount} of {cov.total} stations · {places.length} places
        </p>

        <a
          href="/submit/"
          className="rounded-md bg-ink px-3 py-1.5 text-[13px] font-semibold text-paper transition-opacity hover:opacity-85"
        >
          Suggest a place
        </a>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* The corridor */}
        <section
          aria-label="Places along the line"
          className={`min-h-0 w-full flex-col border-rule md:flex md:w-[420px] md:shrink-0 md:border-r ${
            selectedPlace ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="shrink-0 border-b border-rule px-5 pb-3.5 pt-4">
            <h1 className="text-[13px] font-bold uppercase tracking-[0.12em] text-ink">
              {line.name} line
            </h1>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
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
            <ol className="browse-scroll min-h-0 flex-1 overflow-y-auto">
              {stationRows.map((row, index) => {
                const checked = row.check === "checked";
                const isLast = index === lastIndex;
                const active = checked && row.stationSlug === selectedSlug;

                return (
                  <li
                    key={row.code}
                    role={checked ? "group" : undefined}
                    aria-label={checked ? row.name : undefined}
                    data-station-count={checked ? row.count : undefined}
                    className="relative"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute left-[22px] top-0 z-10 w-[2px]"
                      style={{
                        bottom: isLast ? "auto" : 0,
                        height: isLast ? "30px" : undefined,
                        backgroundColor: checked
                          ? "var(--browse-accent)"
                          : "var(--color-rule-strong)",
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute left-[16px] top-[14px] z-20 h-[14px] w-[14px] rounded-full border-2"
                      style={{
                        borderColor: checked
                          ? "var(--browse-accent)"
                          : "var(--color-rule-strong)",
                        backgroundColor: checked
                          ? "var(--browse-accent)"
                          : "var(--color-paper)",
                      }}
                    />

                    {checked ? (
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
                              <li key={place.slug} role="listitem" className="relative">
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
                                  className="browse-row flex w-full items-center py-3 pl-[52px] pr-12 text-left transition-colors hover:bg-band"
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
                                <a
                                  href={`/places/${place.slug}/`}
                                  aria-label={`Open the full page for ${place.name}`}
                                  title="Open the full page for this place"
                                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-1.5 text-ink-soft transition-colors hover:bg-paper hover:text-ink"
                                >
                                  <OpenIcon />
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    ) : (
                      <div
                        data-station-code={row.code}
                        data-station-unchecked="true"
                        className="flex items-baseline justify-between gap-3 py-2 pl-[52px] pr-4"
                      >
                        <span className="truncate text-[13px] font-medium text-ink-soft">
                          {row.name}
                        </span>
                        <span className="shrink-0 text-[12px] text-ink-soft">
                          Not checked yet
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
          className={`relative min-h-0 flex-1 flex-col bg-band ${
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

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 p-3">
            <div className="pointer-events-auto rounded-lg border border-rule bg-paper px-4 py-3 shadow-[0_1px_2px_rgba(21,23,28,0.05),0_10px_28px_-14px_rgba(21,23,28,0.22)]">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                {selectedPlace && (
                  <button
                    ref={backRef}
                    type="button"
                    onClick={clearSelection}
                    className="-ml-1 inline-flex items-center gap-1.5 rounded px-1 py-1 text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-ink"
                  >
                    <BackIcon />
                    All places
                  </button>
                )}

                <div className="min-w-0 flex-1" aria-live="polite">
                  <div
                    key={selectedPlace?.slug ?? "none"}
                    className="browse-reveal"
                  >
                    {selectedPlace ? (
                      <>
                        <p className="truncate text-[14px] font-semibold text-ink">
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
                      <p className="text-[13px] text-ink-soft">
                        Pick a place from the corridor — its walk or drive route
                        appears here.
                      </p>
                    )}
                  </div>
                </div>

                {selectedPlace && (
                  <div className="browse-reveal flex flex-wrap items-center gap-3">
                    <TravelMode mode={routeMode} onChange={setRouteMode} />
                    <a
                      href={openRouteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-paper transition-opacity hover:opacity-85"
                    >
                      Open route
                    </a>
                    <a
                      href={`/places/${selectedPlace.slug}/`}
                      className="text-[12.5px] font-semibold text-ink-soft underline decoration-rule-strong underline-offset-4 transition-colors hover:text-ink"
                    >
                      Full page
                    </a>
                    <a
                      href={placePinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden text-[12.5px] font-semibold text-ink-soft underline decoration-rule-strong underline-offset-4 transition-colors hover:text-ink sm:inline"
                    >
                      On Maps
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
