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
  /** The checked Stations, in the Line's own order (oldest `sort` first). */
  checked: Station[];
  /** The Stations still to do, in the same order. */
  unchecked: LineStation[];
  /** Whether each set is one unbroken run of the corridor. */
  checkedContiguous: boolean;
  uncheckedContiguous: boolean;
};

function isContiguous(ordered: LineStation[], members: LineStation[]): boolean {
  if (members.length === 0) return true;
  const first = ordered.findIndex((station) => station === members[0]);
  const last = ordered.findIndex((station) => station === members[members.length - 1]);
  return last - first === members.length - 1;
}

/**
 * How much of the Line has been checked, and which stretch has not. Counts come
 * from the data: a Station is checked when it is in the directory's Station
 * list, never when it merely has Places — a checked Station where nothing was
 * found is still checked.
 */
export function coverage(line: Line, checkedStations: Station[]): Coverage {
  const ordered = [...line.stations].sort((a, b) => a.sort - b.sort);
  const byCode = new Map(checkedStations.map((station) => [station.code, station]));
  const members = new Set(ordered.filter((station) => byCode.has(station.code)));

  const checked = ordered
    .filter((station) => members.has(station))
    .map((station) => byCode.get(station.code)!);
  const unchecked = ordered.filter((station) => !members.has(station));

  return {
    checkedCount: checked.length,
    total: ordered.length,
    checked,
    unchecked,
    checkedContiguous: isContiguous(ordered, ordered.filter((s) => members.has(s))),
    uncheckedContiguous: isContiguous(ordered, unchecked),
  };
}

/**
 * The work log, in the directory's own voice, for the page to print.
 *
 * Every count and name comes out of the data, and a stretch is only named by its
 * endpoints when it really is one unbroken run of the corridor: the page cannot
 * claim a span it has not walked, which is the defect this replaces — copy that
 * named a northern end three checked Stations short of the truth.
 */
export function coverageCopy(cov: Coverage): string {
  const head = `I've checked ${cov.checkedCount} of the ${cov.total} stations so far`;

  // South → north, the way the page lists them.
  const south = cov.checked[cov.checked.length - 1];
  const north = cov.checked[0];
  const done =
    cov.checkedContiguous && cov.checked.length > 1
      ? `${head} — ${south.name} up to ${north.name}.`
      : `${head}.`;
  if (cov.unchecked.length === 0) return `${done} The whole line is done.`;

  const remaining = cov.unchecked.length;
  const last = cov.unchecked[remaining - 1];
  const todo = cov.uncheckedContiguous
    ? `The ${remaining} stations from ${cov.unchecked[0].name} to ${last.name} are still to do.`
    : `The ${remaining} stations not named above are still to do.`;
  return `${done} ${todo}`;
}
