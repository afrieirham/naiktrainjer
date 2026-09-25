import { placeStations, type Place } from "./browse-filter.ts";
import type { Connection } from "./contribution.ts";

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
 * Every Station on every Line, by network code. A Connection's Interchange and
 * Connecting links name Stations on other Lines, so the whole network is needed
 * to resolve what one Station reaches.
 */
export function stationsByCode(lines: Line[]): Map<string, LineStation> {
  const byCode = new Map<string, LineStation>();
  for (const line of lines) {
    for (const station of line.stations) byCode.set(station.code, station);
  }
  return byCode;
}

/** The Line a Station code belongs to, or undefined when the network lacks it. */
function lineOfCode(lines: Line[], code: string): Line | undefined {
  return lines.find((line) =>
    line.stations.some((station) => station.code === code),
  );
}

/**
 * Every network code of one physical Station — a Station's own code plus its
 * Interchange twins — ordered by the network's own Line order, so the joined
 * label reads the same whichever twin is picked. A Station with no twin is just
 * itself.
 */
export function stationGroupCodes(station: LineStation, lines: Line[]): string[] {
  const group = new Set<string>([station.code, ...(station.interchange ?? [])]);
  const ordered: string[] = [];
  for (const line of lines) {
    for (const member of line.stations) {
      if (group.has(member.code)) ordered.push(member.code);
    }
  }
  for (const code of group) if (!ordered.includes(code)) ordered.push(code);
  return ordered;
}

/**
 * One Station as a picker reads it: `<code> <name>` for a plain Station, and
 * `<twin codes> <name> · <other Lines>` for an Interchange Station, e.g.
 * `AG7/SP7/KJ13 Masjid Jamek · Kelana Jaya, Sri Petaling`. Every twin carries
 * the same label, so one physical Station is named once.
 *
 * Pure: `lines` is the whole network.
 */
export function stationOptionLabel(station: LineStation, lines: Line[]): string {
  const codes = stationGroupCodes(station, lines);
  if (codes.length <= 1) return `${station.code} ${station.name}`;

  const anchor = lineOfCode(lines, codes[0]);
  const reached = codes
    .map((code) => lineOfCode(lines, code))
    .filter((line): line is Line => line !== undefined && line !== anchor)
    .map((line) => line.name)
    .sort((a, b) => a.localeCompare(b));

  return `${codes.join("/")} ${station.name} · ${reached.join(", ")}`;
}

/**
 * One Place as it appears under one Station: the Place itself, the Station the
 * listing sits under, and the Connection whose stored Route frame answers for
 * it.
 *
 * Most listings are a true Connection, where `connection.station` is
 * `stationCode`. Two kinds are derived, and both reuse the anchor Connection's
 * route rather than storing one of their own:
 *
 * - an **Interchange** twin — the same physical Station on another Line, so no
 *   label and no `alsoNearCode`;
 * - an **Also near** neighbour reached by a walkway — `alsoNearCode` names the
 *   anchor Station whose route the listing borrows, so the page can say
 *   "also near <the other Station>".
 */
export type StationListing = {
  place: Place;
  stationCode: string;
  connection: Connection;
  alsoNearCode?: string;
};

/**
 * Every listing a Place reaches: one per true Connection, in record order, then
 * an Interchange twin and an Also-near neighbour for each. A true Connection or
 * an Interchange twin at a Station wins over an Also-near listing there, so a
 * Place is never doubled up by a walkway it already reaches directly.
 *
 * Pure: `stations` comes from `stationsByCode`.
 */
export function placeListings(
  place: Place,
  stations: Map<string, LineStation>,
): StationListing[] {
  const connections = place.connections ?? [];
  const trueListings: StationListing[] = [];
  const twinListings: StationListing[] = [];
  const nearListings: StationListing[] = [];

  const reached = new Set<string>();
  for (const connection of connections) {
    if (reached.has(connection.station)) continue;
    reached.add(connection.station);
    trueListings.push({ place, stationCode: connection.station, connection });
  }

  const twins = new Set<string>();
  for (const connection of connections) {
    const station = stations.get(connection.station);
    if (!station) continue;
    for (const twin of station.interchange ?? []) {
      if (reached.has(twin) || twins.has(twin)) continue;
      twins.add(twin);
      twinListings.push({ place, stationCode: twin, connection });
    }
  }

  for (const connection of connections) {
    const station = stations.get(connection.station);
    if (!station) continue;
    for (const neighbour of station.connecting ?? []) {
      if (reached.has(neighbour) || twins.has(neighbour)) continue;
      reached.add(neighbour);
      nearListings.push({
        place,
        stationCode: neighbour,
        connection,
        alsoNearCode: connection.station,
      });
    }
  }

  return [...trueListings, ...twinListings, ...nearListings];
}

/**
 * Every Station's listings, by Station code, for the given Places. A Place
 * reaches a Station when it truly Connects to it, or by Interchange or a
 * Connecting neighbour; `lines` is the whole network, because a twin or
 * neighbour may sit on another Line.
 */
export function listingsByStation(
  lines: Line[],
  places: Place[],
): Map<string, StationListing[]> {
  const stations = stationsByCode(lines);
  const byStation = new Map<string, StationListing[]>();
  for (const place of places) {
    for (const listing of placeListings(place, stations)) {
      const list = byStation.get(listing.stationCode);
      if (list) list.push(listing);
      else byStation.set(listing.stationCode, [listing]);
    }
  }
  return byStation;
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
  const withPlaces = coveredCodes(places);
  return lines.filter((line) =>
    line.stations.some((station) => withPlaces.has(station.code)),
  );
}

/**
 * Every Station code any Place truly Connects to.
 *
 * Coverage counts Connections only: an Interchange twin or a Connecting
 * neighbour is a derived listing (`placeListings`), never a Connection, so it
 * never moves this count. The directory states what it holds, not what it merely
 * mentions.
 */
function coveredCodes(places: Place[]): Set<string> {
  const codes = new Set<string>();
  for (const place of places) {
    for (const code of placeStations(place)) codes.add(code);
  }
  return codes;
}

/** How many of a Line's Stations hold a Place. */
function coveredStationCount(line: Line, places: Place[]): number {
  const withPlaces = coveredCodes(places);
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
  const withPlaces = coveredCodes(places);
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
