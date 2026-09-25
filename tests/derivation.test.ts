import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildStationRows,
  placeStations,
  type Place,
} from "../app/lib/browse-filter.ts";
import {
  coverage,
  listingsByStation,
  placeListings,
  stationsByCode,
  type Line,
} from "../app/lib/lines.ts";
import { buildListingRouteFrameUrl } from "../app/lib/route-url.ts";
import { lines, places } from "../app/data/directory.node.ts";

/**
 * A small, explicit network: Line A holds the Places, Line B is an Interchange
 * twin of A1, and Line C is an Also-near neighbour of A1.
 */
const lineA: Line = {
  slug: "line-a",
  code: "A",
  name: "Line A",
  color: "#111111",
  stations: [
    { code: "A1", name: "A One", sort: 1, interchange: ["B1"], connecting: ["C1"] },
    { code: "A2", name: "A Two", sort: 2 },
  ],
};
const lineB: Line = {
  slug: "line-b",
  code: "B",
  name: "Line B",
  color: "#222222",
  stations: [{ code: "B1", name: "B One", sort: 1, interchange: ["A1"] }],
};
const lineC: Line = {
  slug: "line-c",
  code: "C",
  name: "Line C",
  color: "#333333",
  stations: [{ code: "C1", name: "C One", sort: 1 }],
};
const network: Line[] = [lineA, lineB, lineC];

function place(slug: string, connections: Place["connections"]): Place {
  return {
    slug,
    name: slug,
    kind: "building",
    type: "condominium",
    map: "https://maps.app.goo.gl/place",
    connections,
  };
}

const WALK_A1 = "https://www.google.com/maps/embed?pb=!3e2!a1";
const placeAtA1 = place("place-a1", [{ station: "A1", embed: WALK_A1 }]);

describe("Interchange propagation", () => {
  it("shows a Place under an Interchange twin's Station with the same route", () => {
    const rows = buildStationRows(lineB, [placeAtA1], [placeAtA1], network);
    const b1 = rows.find((row) => row.code === "B1");
    assert.ok(b1, "the twin Station must carry the Place");
    assert.equal(b1.count, 1);
    assert.equal(b1.places[0].slug, "place-a1");

    const listing = b1.listings[0];
    assert.equal(listing.stationCode, "B1");
    assert.equal(listing.alsoNearCode, undefined, "a twin is not an Also-near row");
    assert.equal(listing.connection, placeAtA1.connections[0], "a twin shares the anchor route");
    assert.equal(
      buildListingRouteFrameUrl(listing.place, listing.connection, "walk"),
      WALK_A1,
    );
  });

  it("still lists every true Connection on the Place's own Line", () => {
    const rows = buildStationRows(lineA, [placeAtA1], [placeAtA1], network);
    const a1 = rows.find((row) => row.code === "A1");
    assert.ok(a1);
    assert.equal(a1.listings[0].stationCode, "A1");
    assert.equal(a1.listings[0].alsoNearCode, undefined);
  });
});

describe("Connecting neighbours", () => {
  it("lists a Place beside the neighbour as Also near", () => {
    const rows = buildStationRows(lineC, [placeAtA1], [placeAtA1], network);
    const c1 = rows.find((row) => row.code === "C1");
    assert.ok(c1, "the neighbour Station must carry the Place");
    assert.equal(c1.count, 1);

    const listing = c1.listings[0];
    assert.equal(listing.stationCode, "C1");
    assert.equal(listing.alsoNearCode, "A1", "the listing names the anchor Station");
    assert.equal(listing.connection, placeAtA1.connections[0]);
  });

  it("reuses the anchor Connection's route, falling back to the Map link", () => {
    const listing = listingsByStation(network, [placeAtA1]).get("C1")![0];
    assert.equal(
      buildListingRouteFrameUrl(listing.place, listing.connection, "walk"),
      WALK_A1,
    );

    const bare = place("bare", [{ station: "A1", embed: null }]);
    const bareListing = listingsByStation(network, [bare]).get("C1")![0];
    assert.equal(
      buildListingRouteFrameUrl(bareListing.place, bareListing.connection, "walk"),
      bare.map,
    );
  });
});

describe("selection keyed by Place + Station", () => {
  const E1 = "https://www.google.com/maps/embed?pb=!3e2!one";
  const E2 = "https://www.google.com/maps/embed?pb=!3e2!two";
  const twoStations = place("two", [
    { station: "A1", embed: E1 },
    { station: "A2", embed: E2 },
  ]);

  it("shows a Place with two Connections on one Line twice", () => {
    const rows = buildStationRows(lineA, [twoStations], [twoStations], network);
    const a1 = rows.find((row) => row.code === "A1")!;
    const a2 = rows.find((row) => row.code === "A2")!;
    assert.equal(a1.count, 1);
    assert.equal(a2.count, 1);
    assert.equal(
      rows.reduce((total, row) => total + row.count, 0),
      2,
      "both Connections must render",
    );
  });

  it("resolves each row's own route", () => {
    const rows = buildStationRows(lineA, [twoStations], [twoStations], network);
    const a1 = rows.find((row) => row.code === "A1")!.listings[0];
    const a2 = rows.find((row) => row.code === "A2")!.listings[0];
    assert.equal(a1.connection.embed, E1);
    assert.equal(a2.connection.embed, E2);
    assert.notEqual(
      buildListingRouteFrameUrl(twoStations, a1.connection, "walk"),
      buildListingRouteFrameUrl(twoStations, a2.connection, "walk"),
    );
  });

  it("prefers a true Connection over a derived listing at the same Station", () => {
    const both = place("both", [
      { station: "A1", embed: null },
      { station: "B1", embed: null },
    ]);
    const atA1 = placeListings(both, stationsByCode(network)).filter(
      (listing) => listing.stationCode === "A1",
    );
    assert.equal(atA1.length, 1);
    assert.equal(atA1[0].connection.station, "A1");
    assert.equal(atA1[0].alsoNearCode, undefined);
  });
});

describe("Coverage counts Connections only", () => {
  it("does not count an Interchange twin or a Connecting neighbour", () => {
    assert.equal(coverage(lineA, [placeAtA1]).coveredCount, 1);
    assert.equal(coverage(lineB, [placeAtA1]).coveredCount, 0);
    assert.equal(coverage(lineC, [placeAtA1]).coveredCount, 0);
  });

  it("still lists the Place on the twin and neighbour Lines", () => {
    const twin = buildStationRows(lineB, [placeAtA1], [placeAtA1], network);
    const neighbour = buildStationRows(lineC, [placeAtA1], [placeAtA1], network);
    assert.equal(twin.find((row) => row.code === "B1")!.count, 1);
    assert.equal(neighbour.find((row) => row.code === "C1")!.count, 1);
  });
});

describe("the real network reaches its twins and neighbours", () => {
  const byStation = listingsByStation(lines, places);

  it("derives the BRT twin of KJ31 USJ 7 with no Also-near label", () => {
    const brt7 = byStation.get("BRT7") ?? [];
    const listing = brt7.find((entry) => entry.connection.station === "KJ31");
    assert.ok(listing, "USJ 7's Places must reach BRT7");
    assert.equal(listing.alsoNearCode, undefined, "USJ 7 is one physical Station");
  });

  it("derives the SA neighbour of KJ27 CGC Glenmarie as Also near", () => {
    const sa7 = byStation.get("SA7") ?? [];
    const listing = sa7.find((entry) => entry.connection.station === "KJ27");
    assert.ok(listing, "Glenmarie's Places must reach Glenmarie 2");
    assert.equal(listing.alsoNearCode, "KJ27");
  });

  it("derives the SP twin of KJ37 Putra Heights", () => {
    const sp31 = byStation.get("SP31") ?? [];
    assert.ok(sp31.some((entry) => entry.connection.station === "KJ37"));
  });

  it("counts no derived Station in a Line's Coverage", () => {
    const connected = new Set(places.flatMap((entry) => placeStations(entry)));
    for (const line of lines) {
      const trueStations = line.stations.filter((station) =>
        connected.has(station.code),
      ).length;
      assert.equal(
        coverage(line, places).coveredCount,
        trueStations,
        `Coverage for ${line.slug} must count true Connections only`,
      );
    }
  });
});
