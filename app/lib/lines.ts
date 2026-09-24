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
  /**
   * Stations that are one physical station on another Line. A Connection to one
   * shows the Place on every twin Line with the same route.
   */
  interchange?: string[];
  /**
   * Stations joined to a different, walkable station. A Connection to one also
   * lists the Place at the neighbour, as "Also near".
   */
  connecting?: string[];
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
 * The Lines the directory covers: those holding at least one Place, in the
 * network's own order.
 *
 * A Line is covered when one of its Stations holds a Place, so the selector
 * never offers a corridor with nothing on it. The network still knows every
 * Line; this is only the subset worth browsing.
 */
export function coveredLines(lines: Line[], places: Place[]): Line[] {
  const withPlaces = new Set(places.map((place) => place.station));
  return lines.filter((line) =>
    line.stations.some((station) => withPlaces.has(station.code)),
  );
}

/** How many of a Line's Stations hold a Place. */
function coveredStationCount(line: Line, places: Place[]): number {
  const withPlaces = new Set(places.map((place) => place.station));
  return line.stations.filter((station) => withPlaces.has(station.code)).length;
}

/**
 * The Line the directory defaults to: covered, holding the most Places.
 *
 * Deliberately not "the Line with the lowest source position" — the network
 * reference carries Lines nobody has a Place on, and that rule would pick one of
 * them and show an empty corridor. Ties break by network order, so the choice is
 * deterministic.
 */
export function coveredLine(lines: Line[], places: Place[]): Line {
  const covered = coveredLines(lines, places);
  if (covered.length === 0) {
    throw new Error("No Line holds a Place — the directory has no coverage");
  }

  let best = covered[0];
  let most = coveredStationCount(best, places);
  for (const line of covered.slice(1)) {
    const count = coveredStationCount(line, places);
    if (count > most) {
      most = count;
      best = line;
    }
  }
  return best;
}

/**
 * The Line a `?line=` slug names, falling back to the default Line.
 *
 * Only a covered Line can be selected: an unknown, blank or missing slug lands
 * on the default, so a stale or mistyped link still shows a corridor.
 */
export function selectedLine(
  lines: Line[],
  places: Place[],
  slug: string | null | undefined,
): Line {
  if (slug) {
    const found = coveredLines(lines, places).find((line) => line.slug === slug);
    if (found) return found;
  }
  return coveredLine(lines, places);
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
