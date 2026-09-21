import { useState, useMemo } from "react";
import { useLoaderData } from "react-router";
import propertiesData from "../../data/properties.json";
import type { Place, Station } from "../lib/browse-filter";
import {
  buildRouteFrameUrl,
  buildOpenRouteUrl,
  type RouteMode,
} from "../lib/route-url";
import { RouteFrame } from "../components/RouteFrame";
import { AppBar, AppBarAction } from "../components/AppBar";
import { TravelMode } from "../components/TravelMode";
import { BackIcon, OpenIcon } from "../components/icons";
import { publicUrl } from "../lib/routes";
import { coveredLine, coverage, type Line } from "../lib/lines";
import { TYPE_LABELS, KIND_LABELS, metaLabel } from "../lib/labels";
import type { Route } from "./+types/place";

/** The Line the directory covers, so no page names a Line by hand. */
const CHECKED_STATIONS = propertiesData.stations as Station[];
const COVERED_LINE = coveredLine(propertiesData.lines as Line[], CHECKED_STATIONS);
const COVERAGE = coverage(COVERED_LINE, CHECKED_STATIONS);
const COUNTS = `${COVERAGE.checkedCount} of ${COVERAGE.total} stations · ${propertiesData.places.length} places`;

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
    lineName: COVERED_LINE.name,
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { place, stationName, lineName } = loaderData;
  const typeLabel = TYPE_LABELS[place.type] ?? place.type;
  const kindLabel = KIND_LABELS[place.kind] ?? place.kind;

  let description: string;
  if (place.kind === "area") {
    description = `${place.name} is a neighbourhood near ${stationName} on the ${lineName} line. Walk and drive routes on NaikTrainJer.`;
  } else {
    description = `${place.name} is a ${typeLabel.toLowerCase()} near ${stationName} on the ${lineName} line. Walk and drive routes on NaikTrainJer.`;
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
  const { place, stationName, alsoNearNames, lineName } = useLoaderData<typeof loader>();
  const [routeMode, setRouteMode] = useState<RouteMode>("walk");

  const routeFrameUrl = useMemo(
    () => buildRouteFrameUrl(place, stationName, routeMode),
    [place, stationName, routeMode],
  );

  const openRouteUrl = useMemo(
    () => buildOpenRouteUrl(place, stationName, routeMode),
    [place, stationName, routeMode],
  );

  const typeLabel = TYPE_LABELS[place.type] ?? place.type;
  const isBuilding = place.kind === "building";
  const sentence = isBuilding
    ? `${place.name} is a ${typeLabel.toLowerCase()} near ${stationName}, on the ${lineName} line.`
    : `${place.name} is a neighbourhood near ${stationName}, on the ${lineName} line.`;

  return (
    <div
      className="flex min-h-dvh flex-col md:h-dvh md:overflow-hidden"
      style={{ "--line-accent": COVERED_LINE.color } as React.CSSProperties}
    >
      <AppBar
        subtitle={`${lineName} line`}
        counts={COUNTS}
        action={<AppBarAction href="/submit/">Suggest a place</AppBarAction>}
      />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/*
          The details column. On a phone the route leads, so this sits below it and
          the order swaps back at `md`, where the two columns sit side by side.
        */}
        <section
          aria-label="Place details"
          className="app-scroll order-2 border-t border-rule md:order-1 md:min-h-0 md:w-[420px] md:shrink-0 md:overflow-y-auto md:border-t-0 md:border-r"
        >
          <div className="border-b border-rule px-5 py-5 md:px-6">
            <h1 className="text-[26px] font-bold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[34px]">
              {place.name}
            </h1>
            <p className="mt-2 text-[12.5px] font-medium text-ink-soft">
              {metaLabel(place)}
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
              {sentence}
            </p>
          </div>

          <dl className="px-5 py-5 md:px-6">
            <dt className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Nearest station
            </dt>
            <dd className="mt-1 text-[13.5px] font-semibold text-ink">{stationName}</dd>

            {alsoNearNames.length > 0 && (
              <>
                <dt className="mt-4 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                  Also near
                </dt>
                <dd className="mt-1 text-[13.5px] font-semibold text-ink">
                  {alsoNearNames.join(", ")}
                </dd>
              </>
            )}
          </dl>

          <div className="px-5 pb-6 md:px-6">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              <BackIcon />
              All places
            </a>
          </div>
        </section>

        {/*
          The route column. The map owns its box and the strip sits below it, never
          over it — an overlay here would cover the frame and swallow Google's own
          map controls.
        */}
        <section
          aria-label="Route map"
          className="order-1 flex flex-col md:order-2 md:min-h-0 md:flex-1"
        >
          {/* The phone's map label, because the route leads there. */}
          <div className="shrink-0 border-b border-rule bg-paper px-4 py-3 md:hidden">
            <p className="text-[16px] font-bold leading-tight tracking-[-0.02em] text-ink">
              {place.name}
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">near {stationName}</p>
          </div>

          <div className="relative h-[52vh] shrink-0 md:h-auto md:min-h-0 md:flex-1">
            {routeFrameUrl ? (
              <RouteFrame
                src={routeFrameUrl}
                mode={routeMode}
                className="absolute inset-0 block h-full w-full border-0"
              />
            ) : null}
          </div>

          <div className="shrink-0 border-t border-rule bg-paper px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex flex-wrap items-center gap-3">
              <TravelMode mode={routeMode} onChange={setRouteMode} />
              <a
                href={openRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft underline decoration-rule-strong underline-offset-4 transition-colors hover:text-ink"
              >
                Open route
                <OpenIcon size={13} />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
