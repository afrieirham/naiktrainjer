import type { Place } from "./browse-filter";

export type RouteMode = "walk" | "drive";

export function buildRouteFrameUrl(
  place: Place,
  stationName: string,
  mode: RouteMode,
): string {
  const origin = place.coordinates
    ? `${place.coordinates.lat},${place.coordinates.lng}`
    : place.name;
  const dirflg = mode === "walk" ? "w" : "d";
  return (
    `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}` +
    `&daddr=${encodeURIComponent(stationName)}` +
    `&dirflg=${dirflg}&output=embed`
  );
}

export function buildOpenRouteUrl(
  place: Place,
  stationName: string,
  mode: RouteMode,
): string {
  const origin = place.coordinates
    ? `${place.coordinates.lat},${place.coordinates.lng}`
    : place.name;
  const travelmode = mode === "walk" ? "walking" : "driving";
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(stationName)}` +
    `&travelmode=${travelmode}`
  );
}

export function buildPlacePinUrl(place: Place): string {
  if (place.map) return place.map;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
}
