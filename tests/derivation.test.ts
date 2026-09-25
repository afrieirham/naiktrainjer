import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildStationRows,
  placeStations,
  type Place,
} from "../app/lib/browse-filter.ts";
import {
  coverage,
  coveredLines,
  placesOnLine,
  stationPlacesByCode,
  stationPlacesForPlace,
  stationsByCode,
  type Line,
} from "../app/lib/lines.ts";
import { buildConnectionRouteFrameUrl } from "../app/lib/route-url.ts";
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

    const entry = b1.stationPlaces[0];
    assert.equal(entry.stationCode, "B1");
    assert.equal(entry.alsoNearCode, undefined, "a twin is not an Also-near row");
    assert.equal(entry.connection, placeAtA1.connections[0], "a twin shares the anchor route");
    assert.equal(
      buildConnectionRouteFrameUrl(entry.connection, "walk"),
      WALK_A1,
    );
  });

  it("still lists every true Connection on the Place's own Line", () => {
    const rows = buildStationRows(lineA, [placeAtA1], [placeAtA1], network);
    const a1 = rows.find((row) => row.code === "A1");
    assert.ok(a1);
    assert.equal(a1.stationPlaces[0].stationCode, "A1");
    assert.equal(a1.stationPlaces[0].alsoNearCode, undefined);
  });
});

describe("Connecting neighbours", () => {
  it("lists a Place beside the neighbour as Also near", () => {
    const rows = buildStationRows(lineC, [placeAtA1], [placeAtA1], network);
    const c1 = rows.find((row) => row.code === "C1");
    assert.ok(c1, "the neighbour Station must carry the Place");
    assert.equal(c1.count, 1);

    const entry = c1.stationPlaces[0];
    assert.equal(entry.stationCode, "C1");
    assert.equal(entry.alsoNearCode, "A1", "the entry names the anchor Station");
    assert.equal(entry.connection, placeAtA1.connections[0]);
  });

  it("reuses the anchor Connection's route, and frames nothing when it stored none", () => {
    const entry = stationPlacesByCode(network, [placeAtA1]).get("C1")![0];
    assert.equal(
      buildConnectionRouteFrameUrl(entry.connection, "walk"),
      WALK_A1,
    );

    const bare = place("bare", [{ station: "A1", embed: null }]);
    const bareEntry = stationPlacesByCode(network, [bare]).get("C1")![0];
    assert.equal(
      buildConnectionRouteFrameUrl(bareEntry.connection, "walk"),
      null,
      "a Connection with no stored frame must not frame the Map link",
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
    const a1 = rows.find((row) => row.code === "A1")!.stationPlaces[0];
    const a2 = rows.find((row) => row.code === "A2")!.stationPlaces[0];
    assert.equal(a1.connection.embed, E1);
    assert.equal(a2.connection.embed, E2);
    assert.notEqual(
      buildConnectionRouteFrameUrl(a1.connection, "walk"),
      buildConnectionRouteFrameUrl(a2.connection, "walk"),
    );
  });

  it("prefers a true Connection over a derived station entry at the same Station", () => {
    const both = place("both", [
      { station: "A1", embed: null },
      { station: "B1", embed: null },
    ]);
    const atA1 = stationPlacesForPlace(both, stationsByCode(network)).filter(
      (entry) => entry.stationCode === "A1",
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

describe("a derived station entry makes its Line browsable", () => {
  it("lists the Place on the twin and neighbour Lines", () => {
    assert.deepEqual(placesOnLine(lineA, network, [placeAtA1]), [placeAtA1]);
    assert.deepEqual(placesOnLine(lineB, network, [placeAtA1]), [placeAtA1]);
    assert.deepEqual(placesOnLine(lineC, network, [placeAtA1]), [placeAtA1]);
  });

  it("offers every Line a Place reaches, while Coverage stays on true Connections", () => {
    assert.deepEqual(
      coveredLines(network, [placeAtA1]).map((line) => line.slug),
      ["line-a", "line-b", "line-c"],
    );
    assert.equal(coverage(lineB, [placeAtA1]).coveredCount, 0);
    assert.equal(coverage(lineC, [placeAtA1]).coveredCount, 0);
  });

  it("names the anchor Station on the neighbour's row and reuses its route", () => {
    const rows = buildStationRows(lineC, [placeAtA1], [placeAtA1], network);
    const entry = rows.find((row) => row.code === "C1")!.stationPlaces[0];
    assert.equal(entry.stationCode, "C1");
    assert.equal(entry.alsoNearCode, "A1");
    assert.equal(
      buildConnectionRouteFrameUrl(entry.connection, "walk"),
      WALK_A1,
    );
  });
});

describe("the real network reaches its twins and neighbours", () => {
  const byStation = stationPlacesByCode(lines, places);

  it("derives the BRT twin of KJ31 USJ 7 with no Also-near label", () => {
    const brt7 = byStation.get("BRT7") ?? [];
    const entry = brt7.find((entry) => entry.connection.station === "KJ31");
    assert.ok(entry, "USJ 7's Places must reach BRT7");
    assert.equal(entry.alsoNearCode, undefined, "USJ 7 is one physical Station");
  });

  it("derives the SA neighbour of KJ27 CGC Glenmarie as Also near", () => {
    const sa7 = byStation.get("SA7") ?? [];
    const entry = sa7.find((entry) => entry.connection.station === "KJ27");
    assert.ok(entry, "Glenmarie's Places must reach Glenmarie 2");
    assert.equal(entry.alsoNearCode, "KJ27");
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
