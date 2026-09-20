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
};

/** A Station that has been checked: it sits on a Line, by network code. */
export type Station = {
  slug: string;
  name: string;
  line: string;
  code: string;
  coordinates?: { lat: number; lng: number };
};

/**
 * One row of the corridor. A checked row carries its Places; an unchecked row
 * is a Station on the Line nobody has looked at yet, and carries none.
 */
export type StationRow = {
  code: string;
  /** What the row is called: the checked Station's own name, else the Line's. */
  name: string;
  check: "checked" | "unchecked";
  stationSlug?: string;
  count: number;
  places: Place[];
};

export function filterPlaces(places: Place[], typeFilter: string): Place[] {
  return places.filter((place) => !typeFilter || place.type === typeFilter);
}

/**
 * Build the corridor: every Station on the Line, in the Line's own order, with
 * the Places that match the current filter under the Stations that have any.
 *
 * A checked Station stays on the page when a filter empties it, but only where
 * the data itself holds nothing for it — otherwise filtering by type would look
 * like the directory had never checked that Station. An unchecked Station is
 * never dropped: the page states what it has not done.
 *
 * The corridor's own order is the only order. There is deliberately no A–Z or
 * "most places" sort: line order is real information, not a sort option.
 */
export function buildStationRows(
  line: Line,
  checkedStations: Station[],
  allPlaces: Place[],
  matchedPlaces: Place[],
): StationRow[] {
  const byCode = new Map(checkedStations.map((station) => [station.code, station]));

  const totalBySlug = new Map<string, number>();
  for (const place of allPlaces) {
    totalBySlug.set(place.station, (totalBySlug.get(place.station) ?? 0) + 1);
  }

  const matchedBySlug = new Map<string, Place[]>();
  for (const place of matchedPlaces) {
    const list = matchedBySlug.get(place.station);
    if (list) list.push(place);
    else matchedBySlug.set(place.station, [place]);
  }

  const rows: StationRow[] = [];
  const stations = [...line.stations].sort((a, b) => b.sort - a.sort);

  for (const station of stations) {
    const checked = byCode.get(station.code);
    if (!checked) {
      rows.push({
        code: station.code,
        name: station.name,
        check: "unchecked",
        count: 0,
        places: [],
      });
      continue;
    }

    const places = [...(matchedBySlug.get(checked.slug) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const checkedAndEmpty = (totalBySlug.get(checked.slug) ?? 0) === 0;
    if (places.length === 0 && !checkedAndEmpty) continue;

    rows.push({
      code: station.code,
      name: checked.name,
      check: "checked",
      stationSlug: checked.slug,
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
