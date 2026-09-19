import { useState, useMemo } from "react";
import { useLoaderData } from "react-router";
import propertiesData from "../../data/properties.json";
import {
  filterPlaces,
  groupByStation,
  getUniqueTypes,
  type Place,
  type PlaceGroup,
  type SortMode,
} from "../lib/browse-filter";
import {
  buildRouteFrameUrl,
  buildOpenRouteUrl,
  buildPlacePinUrl,
  type RouteMode,
} from "../lib/route-url";
import { RouteFrame } from "../components/RouteFrame";
import { WalkDriveToggle } from "../components/WalkDriveToggle";
import { TYPE_LABELS, KIND_LABELS, TYPE_CLASSES, metaLabel, formatMeasurement } from "../lib/labels";
import type { Route } from "./+types/browse";

export function loader() {
  return {
    stations: propertiesData.stations,
    places: propertiesData.places as Place[],
  };
}

/**
 * The site's own page. The root layout no longer hardcodes a title or description,
 * so every route must supply its own — otherwise a page ships with no metadata at all.
 */
export const meta: Route.MetaFunction = () => [
  { title: "NaikTrainJer — places near LRT stations on the Kelana Jaya line" },
  {
    name: "description",
    content: `Browse ${propertiesData.places.length} places I checked near LRT stations on the Kelana Jaya line, from Putra Heights to KL Gateway. Walk or drive directions to the station.`,
  },
  { tagName: "link", rel: "canonical", href: "https://naiktrainjer.com/" },
];

export default function Browse() {
  const { stations, places } = useLoaderData<typeof loader>();

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [stationFilter, setStationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("station");
  const [routeMode, setRouteMode] = useState<RouteMode>("walk");

  const uniqueTypes = useMemo(() => getUniqueTypes(places), [places]);

  const stationNameMap = useMemo(
    () => new Map(stations.map((s) => [s.slug, s.name])),
    [stations],
  );

  const filteredPlaces = useMemo(
    () => filterPlaces(places, stationFilter, typeFilter),
    [places, stationFilter, typeFilter],
  );

  const stationGroups = useMemo(
    () => groupByStation(filteredPlaces, stations, sortMode),
    [filteredPlaces, stations, sortMode],
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
    return selectedPlace.alsoNear.map(
      (slug) => stationNameMap.get(slug) ?? slug,
    );
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

  const stationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const place of places) {
      if (typeFilter && place.type !== typeFilter) continue;
      counts.set(place.station, (counts.get(place.station) ?? 0) + 1);
    }
    return counts;
  }, [places, typeFilter]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const place of places) {
      if (stationFilter && place.station !== stationFilter) continue;
      counts.set(place.type, (counts.get(place.type) ?? 0) + 1);
    }
    return counts;
  }, [places, stationFilter]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                NaikTrainJer
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Places near LRT · Kelana Jaya line
              </p>
            </div>
            <WalkDriveToggle mode={routeMode} onChange={setRouteMode} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 w-full">
        <p className="mb-4 text-sm text-slate-600 leading-relaxed">
          A directory of places to rent near LRT stations on the Kelana Jaya line, from
          Putra Heights to KL Gateway. Every place was checked while hunting for a rental — added
          as they were found along the line.
        </p>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
          <aside
            className="md:w-[380px] lg:w-[420px] border-b md:border-b-0 md:border-r border-slate-200 flex flex-col max-h-[42vh] md:max-h-none"
            aria-label="Places list"
          >
            <div className="p-3 sm:p-4 border-b border-slate-100 space-y-2.5 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
                <select
                  id="station-filter"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  value={stationFilter}
                  onChange={(e) => {
                    setStationFilter(e.target.value);
                    setSelectedSlug(null);
                  }}
                >
                  <option value="">All stations</option>
                  {stations.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name} ({stationCounts.get(s.slug) ?? 0})
                    </option>
                  ))}
                </select>
                <select
                  id="type-filter"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setSelectedSlug(null);
                  }}
                >
                  <option value="">All types</option>
                  {uniqueTypes.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t] ?? t} ({typeCounts.get(t) ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <p className="text-xs text-slate-500">
                  {filteredPlaces.length} place
                  {filteredPlaces.length === 1 ? "" : "s"}
                </p>
                <div className="flex items-center gap-3">
                  <select
                    id="sort-mode"
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white outline-none focus:border-sky-400"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                  >
                    <option value="station">Station order</option>
                    <option value="az">A–Z</option>
                    <option value="most">Most places</option>
                  </select>
                  {(stationFilter || typeFilter) && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-sky-600 hover:text-sky-800"
                      onClick={() => {
                        setStationFilter("");
                        setTypeFilter("");
                        setSelectedSlug(null);
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1" role="list">
              {stationGroups.length === 0 && (
                <p className="p-8 text-sm text-slate-400 text-center">
                  No matches. Try clearing filters.
                </p>
              )}
              {stationGroups.map((group) => (
                <div
                  key={group.stationSlug}
                  role="group"
                  aria-label={group.stationName}
                >
                  <div className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 px-4 py-2.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      {group.stationName}{" "}
                      <span className="font-semibold normal-case tracking-normal">
                        ({group.count})
                      </span>
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.places.map((place) => {
                      const isActive = place.slug === selectedSlug;
                      return (
                        <button
                          key={place.slug}
                          type="button"
                          className={`w-full text-left px-4 py-3.5 transition ${
                            isActive
                              ? "bg-sky-50 border-l-4 border-l-sky-500"
                              : "hover:bg-slate-50 border-l-4 border-l-transparent"
                          }`}
                          role="listitem"
                          onClick={() => setSelectedSlug(place.slug)}
                        >
                          <a
                            href={`/places/${place.slug}/`}
                            onClick={(e) => e.stopPropagation()}
                            className="block"
                          >
                            <p
                              className={`font-semibold text-sm leading-snug ${
                                isActive ? "text-sky-950" : "text-slate-900"
                              }`}
                            >
                              {place.name}
                            </p>
                          </a>
                          <p className="text-xs text-slate-500 mt-1">
                            {metaLabel(place)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section
            className="flex-1 flex flex-col min-w-0 min-h-[220px] md:min-h-0 md:sticky md:top-20 md:h-[calc(100vh-13rem)]"
            aria-label="Place details"
          >
            {selectedPlace ? (
              <div className="px-4 sm:px-5 py-4 border-b border-slate-100 shrink-0">
                <div className="space-y-3">
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                      {selectedPlace.name}
                    </h2>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          TYPE_CLASSES[selectedPlace.type] ??
                          "bg-slate-100 text-slate-600 ring-slate-500/10"
                        }`}
                      >
                        {TYPE_LABELS[selectedPlace.type] ??
                          selectedPlace.type}
                      </span>
                      {(KIND_LABELS[selectedPlace.kind] ?? selectedPlace.kind) !==
                        (TYPE_LABELS[selectedPlace.type] ?? selectedPlace.type) && (
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-slate-100 text-slate-600 ring-slate-500/10">
                          {KIND_LABELS[selectedPlace.kind] ?? selectedPlace.kind}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3 sm:px-4 text-sm space-y-1.5">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Nearest station
                      </span>
                      <p className="font-semibold text-slate-900">
                        {selectedStationName}
                      </p>
                    </div>
                    {selectedAlsoNear.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Also near
                        </span>
                        <p className="font-semibold text-slate-900">
                          {selectedAlsoNear.join(", ")}
                        </p>
                      </div>
                    )}
                    {selectedPlace.walkMinutes !== undefined &&
                      selectedPlace.walkMeters !== undefined &&
                      selectedPlace.driveMinutes !== undefined && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Walk / drive
                          </span>
                          <p className="font-semibold text-slate-900">
                            {formatMeasurement(
                              selectedPlace.walkMinutes,
                              selectedPlace.walkMeters,
                              selectedPlace.driveMinutes,
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {selectedPlace.driveMinutes === 1
                              ? "1 min drive"
                              : `${selectedPlace.driveMinutes} min drive`}
                          </p>
                        </div>
                      )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={openRouteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:text-sky-900"
                    >
                      Open route
                      <span aria-hidden="true">&#x2197;</span>
                    </a>
                    <a
                      href={placePinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Place on Google Maps
                      <span aria-hidden="true">&#x2197;</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-sm text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200">
                    <svg
                      className="w-6 h-6 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                  </div>
                  <p className="font-semibold text-slate-800">
                    Select a place
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Details will appear here.
                  </p>
                </div>
              </div>
            )}

            <div className="relative bg-slate-100 flex-1">
              {selectedPlace && routeFrameUrl ? (
                <RouteFrame src={routeFrameUrl} mode={routeMode} />
              ) : (
                <div className="w-full flex items-center justify-center p-6 min-h-[320px] md:min-h-[480px]">
                  <div className="max-w-sm text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <svg
                        className="w-6 h-6 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.75}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                    </div>
                    <p className="font-semibold text-slate-800">
                      {selectedPlace
                        ? "Map coming soon"
                        : "Select a place"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {selectedPlace
                        ? "Walking and driving routes to the station will appear here."
                        : "Details will appear here."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Grouped by station · Kelana Jaya line
        </p>
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-slate-500">
          NaikTrainJer —{" "}
          <a href="/submit/" className="font-semibold text-sky-600 hover:text-sky-800">
            suggest a place
          </a>
        </div>
      </footer>
    </div>
  );
}
