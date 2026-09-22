import type { Place } from "./browse-filter";

/**
 * A Station as the network reference describes it: every Station on the
 * corridor, not only the ones that hold a Place.
 */
export type LineStation = {
  code: string;
  name: string;
  sort: number;
  coordinates?: { lat: number; lng: number };
};

export type Line = {
  slug: string;
  code: string;
  name: string;
  color: string;
  stations: LineStation[];
};

/** Every Station on every Line, by network code, so a code always resolves to a name. */
export function stationNamesByCode(lines: Line[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const line of lines) {
    for (const station of line.stations) names.set(station.code, station.name);
  }
  return names;
}

/**
 * The Line the directory covers: the one holding the most Places.
 *
 * Deliberately not "the Line with the lowest source position" — the network
 * reference carries Lines nobody has a Place on, and that rule would pick one of
 * them and show an empty corridor. Ties break by network order, so the choice is
 * deterministic.
 */
export function coveredLine(lines: Line[], places: Place[]): Line {
  let covered: Line | undefined;
  let most = 0;
  for (const line of lines) {
    const codes = new Set(line.stations.map((station) => station.code));
    const count = places.filter((place) => codes.has(place.station)).length;
    if (count > most) {
      most = count;
      covered = line;
    }
  }

  if (!covered) {
    throw new Error("No Line holds a Place — the directory has no coverage");
  }
  return covered;
}

/**
 * The corridor south → north, which is *reverse* the source's own `sort` order
 * (KJ1 is Gombak, at the northern end). Taken deliberately: it puts the content
 * first and the empty tail at the end of the list, and it is the order the page
 * has always shown.
 */
export function corridorOrder(line: Line): LineStation[] {
  return [...line.stations].sort((a, b) => b.sort - a.sort);
}

export type Coverage = {
  coveredCount: number;
  total: number;
  /** The Stations holding at least one Place, in the Line's own order. */
  covered: LineStation[];
  /** The Stations holding none, in the same order. */
  empty: LineStation[];
};

/**
 * How much of the Line holds Places. Counts come from the data: a Station is
 * covered when it holds at least one Place, never from a record of a walk.
 */
export function coverage(line: Line, places: Place[]): Coverage {
  const ordered = [...line.stations].sort((a, b) => a.sort - b.sort);
  const withPlaces = new Set(places.map((place) => place.station));
  const covered = ordered.filter((station) => withPlaces.has(station.code));
  const empty = ordered.filter((station) => !withPlaces.has(station.code));

  return {
    coveredCount: covered.length,
    total: ordered.length,
    covered,
    empty,
  };
}

/**
 * The work log, in the directory's own voice, for the page to print.
 *
 * A plain ratio: every count comes out of the data, and the copy names no span
 * and no walk the data does not hold.
 */
export function coverageCopy(cov: Coverage): string {
  const head = `${cov.coveredCount} of the ${cov.total} stations have places so far.`;
  if (cov.empty.length === 0) return `${head} The whole line is covered.`;
  return `${head} ${cov.empty.length} stations have no places yet.`;
}
