import type { Station } from "./browse-filter";

/**
 * The Line a Station belongs to, as the network reference describes it: every
 * Station on the corridor, not only the ones this directory has checked.
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

/**
 * The Line the directory covers: the Line you have checked Stations on.
 *
 * Deliberately not "the Line with the lowest source position" — the network
 * reference carries Lines nobody has walked, and that rule would pick one of
 * them and show an empty corridor.
 */
export function coveredLine(lines: Line[], checkedStations: Station[]): Line {
  const checkedCodes = new Set(checkedStations.map((station) => station.code));
  const covered = lines.find((line) =>
    line.stations.some((station) => checkedCodes.has(station.code)),
  );
  if (!covered) {
    throw new Error("No Line has a checked Station — the data file holds no coverage");
  }
  return covered;
}

/**
 * The corridor south → north, which is *reverse* the source's own `sort` order
 * (KJ1 is Gombak, at the northern end). Taken deliberately: it puts the checked
 * stretch first and the uncovered tail at the end of the list, and it is the
 * order the page has always shown.
 */
export function corridorOrder(line: Line): LineStation[] {
  return [...line.stations].sort((a, b) => b.sort - a.sort);
}

/** Checked Stations by the network code that places them on the corridor. */
export function checkedByCode(checkedStations: Station[]): Map<string, Station> {
  return new Map(checkedStations.map((station) => [station.code, station]));
}

export type Coverage = {
  checkedCount: number;
  total: number;
  /** The Stations still to do, in the corridor's own order (oldest `sort` first). */
  unchecked: LineStation[];
};

/**
 * How much of the Line has been checked, and which stretch has not. Counts come
 * from the data: a Station is checked when it is in the directory's Station
 * list, never when it merely has Places — a checked Station where nothing was
 * found is still checked.
 */
export function coverage(line: Line, checkedStations: Station[]): Coverage {
  const checkedCodes = new Set(checkedStations.map((station) => station.code));
  const stations = [...line.stations].sort((a, b) => a.sort - b.sort);
  const unchecked = stations.filter((station) => !checkedCodes.has(station.code));
  return {
    checkedCount: stations.length - unchecked.length,
    total: stations.length,
    unchecked,
  };
}
