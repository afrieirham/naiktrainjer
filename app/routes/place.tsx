import { useState, useMemo } from "react";
import { useLoaderData } from "react-router";
import propertiesData from "../../data/properties.json";
import type { Place } from "../lib/browse-filter";
import {
  buildRouteFrameUrl,
  buildOpenRouteUrl,
  buildPlacePinUrl,
  type RouteMode,
} from "../lib/route-url";
import { RouteFrame } from "../components/RouteFrame";
import { WalkDriveToggle } from "../components/WalkDriveToggle";
import { publicUrl } from "../lib/routes";
import {
  TYPE_LABELS,
  KIND_LABELS,
  TYPE_CLASSES,
  metaLabel,
} from "../lib/labels";
import type { Route } from "./+types/place";

export function loader({ params }: Route.LoaderArgs) {
  const slug = params.placeSlug as string;
  const place = propertiesData.places.find((p) => p.slug === slug);
  if (!place) {
    throw new Response("Not Found", { status: 404 });
  }
  const station = propertiesData.stations.find((s) => s.slug === place.station);
  const alsoNearStations = (place.alsoNear ?? [])
    .map((slug) => propertiesData.stations.find((s) => s.slug === slug))
    .filter(Boolean);
  return {
    place: place as Place,
    stationName: station?.name ?? place.station,
    alsoNearNames: alsoNearStations.map((s) => s!.name),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { place, stationName } = loaderData;
  const typeLabel = TYPE_LABELS[place.type] ?? place.type;
  const kindLabel = KIND_LABELS[place.kind] ?? place.kind;

  let description: string;
  if (place.kind === "area") {
    description = `${place.name} is a neighbourhood near ${stationName} on the Kelana Jaya line. Walk and drive routes on NaikTrainJer.`;
  } else {
    description = `${place.name} is a ${typeLabel.toLowerCase()} near ${stationName} on the Kelana Jaya line. Walk and drive routes on NaikTrainJer.`;
  }

  const ogImage = `https://naiktrainjer.com/og/${place.slug}.png`;
  const pageUrl = publicUrl(`/places/${place.slug}`);
  const title = `${place.name} — NaikTrainJer`;
  const ogType = place.kind === "area" ? "place" : "place";

  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: pageUrl },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: ogType },
    { property: "og:url", content: pageUrl },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];
}

export default function PlacePage() {
  const { place, stationName, alsoNearNames } = useLoaderData<typeof loader>();
  const [routeMode, setRouteMode] = useState<RouteMode>("walk");

  const routeFrameUrl = useMemo(
    () => buildRouteFrameUrl(place, stationName, routeMode),
    [place, stationName, routeMode],
  );

  const openRouteUrl = useMemo(
    () => buildOpenRouteUrl(place, stationName, routeMode),
    [place, stationName, routeMode],
  );

  const placePinUrl = useMemo(() => buildPlacePinUrl(place), [place]);

  const typeLabel = TYPE_LABELS[place.type] ?? place.type;
  const kindLabel = KIND_LABELS[place.kind] ?? place.kind;

  const isBuilding = place.kind === "building";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <a
                href="/"
                className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight hover:text-sky-700 transition"
              >
                NaikTrainJer
              </a>
              <p className="text-sm text-slate-500 mt-0.5">
                Places near LRT · Kelana Jaya line
              </p>
            </div>
            <WalkDriveToggle mode={routeMode} onChange={setRouteMode} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 w-full">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
          <aside
            className="md:w-[380px] lg:w-[420px] border-b md:border-b-0 md:border-r border-slate-200 flex flex-col"
            aria-label="Place details"
          >
            <div className="px-4 sm:px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="space-y-3">
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                    {place.name}
                  </h1>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        TYPE_CLASSES[place.type] ??
                        "bg-slate-100 text-slate-600 ring-slate-500/10"
                      }`}
                    >
                      {typeLabel}
                    </span>
                    {kindLabel !== typeLabel && (
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-slate-100 text-slate-600 ring-slate-500/10">
                        {kindLabel}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {isBuilding
                    ? `${place.name} is a ${typeLabel.toLowerCase()} near ${stationName}.`
                    : `${place.name} is a neighbourhood near ${stationName}.`}
                </p>

                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3 sm:px-4 text-sm space-y-1.5">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Nearest station
                    </span>
                    <p className="font-semibold text-slate-900">{stationName}</p>
                  </div>
                  {alsoNearNames.length > 0 && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Also near
                      </span>
                      <p className="font-semibold text-slate-900">
                        {alsoNearNames.join(", ")}
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

            <div className="p-4">
              <a
                href="/"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-800"
              >
                <span aria-hidden="true">&#x2190;</span>
                Browse all places
              </a>
            </div>
          </aside>

          <section
            className="flex-1 flex flex-col min-w-0 min-h-[220px] md:min-h-0 md:sticky md:top-20 md:h-[calc(100vh-13rem)]"
            aria-label="Route map"
          >
            <div className="relative bg-slate-100 flex-1">
              {routeFrameUrl ? (
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
                      Map coming soon
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Walking and driving routes to the station will appear here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
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
