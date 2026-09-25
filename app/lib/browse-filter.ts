import type { Connection } from "./contribution";
import { listingsByStation } from "./lines.ts";
import type { Line, LineStation, StationListing } from "./lines.ts";

export type Place = {
  slug: string;
  name: string;
  kind: "building" | "area";
  type: string;
  /** The Google Maps link every Place opens in; required on the record. */
  map: string;
  /** One or more Stations this Place is near, each with an optional Route frame. */
  connections: Connection[];
  source?: string;
  /** Present when the Place came from a Contribution; #40 renders the credit. */
  contributor?: { name: string; href: string | null };
};

/** The Station codes a Place is near, one per Connection, in record order. */
export function placeStations(place: Place): string[] {
  const codes: string[] = [];
  for (const connection of place.connections ?? []) {
    if (!codes.includes(connection.station)) codes.push(connection.station);
  }
  return codes;
}

/**
 * One row of the corridor: a Station on the Line, with the listings it shows.
 * A Station holding none carries an empty list.
 *
 * `listings` is the page's shape: each entry names the Place, the Station the
 * row sits under, and the Connection whose route answers. `places` is those
 * Places in the same order, kept for the corridor's rendering.
 */
export type StationRow = {
  code: string;
  name: string;
  count: number;
  listings: StationListing[];
  places: Place[];
};

export function filterPlaces(places: Place[], typeFilter: string): Place[] {
  return places.filter((place) => !typeFilter || place.type === typeFilter);
}

/**
 * Build the corridor: every Station on the Line, in the Line's own order, with
 * the Places that match the current filter under the Stations that hold any.
 *
 * A Place sits under every Station it reaches: each true Connection, every
 * Interchange twin, and every Connecting neighbour as an Also-near listing
 * (`listingsByStation`). A Place near two Stations on one Line appears twice,
 * once per Connection, each listing carrying its own route.
 *
 * `network` is the whole network, so a twin or neighbour on another Line still
 * resolves. It defaults to the Line at hand, enough when every link is local.
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
  network: Line[] = [line],
): StationRow[] {
  const allListings = listingsByStation(network, allPlaces);
  const matchedListings = listingsByStation(network, matchedPlaces);

  const rows: StationRow[] = [];
  for (const station of [...line.stations].sort((a, b) => b.sort - a.sort)) {
    const listings = [...(matchedListings.get(station.code) ?? [])].sort((a, b) =>
      a.place.name.localeCompare(b.place.name),
    );
    if (listings.length === 0 && (allListings.get(station.code)?.length ?? 0) > 0) continue;

    rows.push({
      code: station.code,
      name: station.name,
      count: listings.length,
      listings,
      places: listings.map((listing) => listing.place),
    });
  }

  return rows;
}

export function getUniqueTypes(places: Place[]): string[] {
  return [...new Set(places.map((p) => p.type))].sort();
}

export type { LineStation };
