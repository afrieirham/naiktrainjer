import type { Place } from "./browse-filter";
import type { Connection } from "./contribution";

export type RouteMode = "walk" | "drive";

/** The Connection a Place holds for the Station being viewed, if any. */
export function connectionForStation(
  place: Place,
  stationCode: string,
): Connection | null {
  return place.connections.find((c) => c.station === stationCode) ?? null;
}

/**
 * The stored Route frame is the walking route; the driving view is the same
 * link with its mode segment swapped (`!3e2` → `!3e0`). A link without a mode
 * segment is returned untouched.
 */
function withTravelMode(url: string, mode: RouteMode): string {
  const target = mode === "walk" ? "2" : "0";
  return url.replace(/!3e\d/g, `!3e${target}`);
}

/**
 * The Route frame for the Station being viewed: the Connection's stored embed,
 * falling back to the Place's Map link when that Connection has no frame. Never
 * a calculated route.
 */
export function buildRouteFrameUrl(
  place: Place,
  stationCode: string,
  mode: RouteMode,
): string {
  const connection = connectionForStation(place, stationCode);
  const stored = connection?.embed ?? place.map;
  return withTravelMode(stored, mode);
}

/**
 * The Route frame for one listing, from the Connection it borrows. A true
 * Connection is the Place's own; an Interchange twin or an Also-near listing
 * reuses its anchor Connection's route. Falls back to the Place's Map link when
 * that Connection stored no frame.
 */
export function buildListingRouteFrameUrl(
  place: Place,
  connection: Connection,
  mode: RouteMode,
): string {
  return withTravelMode(connection.embed ?? place.map, mode);
}

/** The route opened in Google Maps, from the Place's name to the Station. */
export function buildOpenRouteUrl(
  place: Place,
  stationName: string,
  mode: RouteMode,
): string {
  const travelmode = mode === "walk" ? "walking" : "driving";
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${encodeURIComponent(place.name)}` +
    `&destination=${encodeURIComponent(stationName)}` +
    `&travelmode=${travelmode}`
  );
}

/** The Place's own Map link, now a required part of the record. */
export function buildPlacePinUrl(place: Place): string {
  return place.map;
}
