import type { Line, LineStation } from "./lines";

export type Place = {
  slug: string;
  name: string;
  kind: "building" | "area";
  type: string;
  station: string;
  alsoNear?: string[];
  map?: string;
  coordinates?: { lat: number; lng: number };
  source?: string;
  /** Present when the Place came from a Contribution; #40 renders the credit. */
  contributor?: { name: string; href: string | null };
};

/**
 * One row of the corridor: a Station on the Line, with the Places it holds.
 * A Station holding none carries an empty list.
 */
export type StationRow = {
  code: string;
  name: string;
  count: number;
  places: Place[];
};

export function filterPlaces(places: Place[], typeFilter: string): Place[] {
  return places.filter((place) => !typeFilter || place.type === typeFilter);
}

/**
 * Build the corridor: every Station on the Line, in the Line's own order, with
 * the Places that match the current filter under the Stations that hold any.
 *
 * A Station the filter empties is dropped, so a type filter never looks like the
 * directory has no Places there. A Station the data holds nothing for stays on
 * the page as an empty row: the page states what it does not have.
 *
 * The corridor's own order is the only order. There is deliberately no A–Z or
 * "most places" sort: line order is real information, not a sort option.
 */
export function buildStationRows(
  line: Line,
  allPlaces: Place[],
  matchedPlaces: Place[],
): StationRow[] {
  const totalByCode = new Map<string, number>();
  for (const place of allPlaces) {
    totalByCode.set(place.station, (totalByCode.get(place.station) ?? 0) + 1);
  }

  const matchedByCode = new Map<string, Place[]>();
  for (const place of matchedPlaces) {
    const list = matchedByCode.get(place.station);
    if (list) list.push(place);
    else matchedByCode.set(place.station, [place]);
  }

  const rows: StationRow[] = [];
  for (const station of [...line.stations].sort((a, b) => b.sort - a.sort)) {
    const places = [...(matchedByCode.get(station.code) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    if (places.length === 0 && (totalByCode.get(station.code) ?? 0) > 0) continue;

    rows.push({
      code: station.code,
      name: station.name,
      count: places.length,
      places,
    });
  }

  return rows;
}

export function getUniqueTypes(places: Place[]): string[] {
  return [...new Set(places.map((p) => p.type))].sort();
}

export type { LineStation };
