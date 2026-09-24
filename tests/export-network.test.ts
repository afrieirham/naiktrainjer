import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildNetwork } from "../scripts/export-network.mjs";
import { lines } from "../app/data/directory.node.ts";

/**
 * PocketBase stores Station links as relation ids. These fixtures mirror that
 * shape: `interchange` and `connecting` on a Station are ids, not codes.
 */
function fixture() {
  const stations = [
    { id: "a1", code: "A1", name: "One", sort: 1, geoPoint: { lat: 1, lon: 10 }, interchange: ["b1"], connecting: [] },
    { id: "a2", code: "A2", name: "Two", sort: 2, geoPoint: { lat: 1, lon: 10 }, interchange: [], connecting: ["b2"] },
    { id: "b1", code: "B1", name: "One", sort: 1, geoPoint: { lat: 2, lon: 20 }, interchange: ["a1"], connecting: [] },
    { id: "b2", code: "B2", name: "Two", sort: 2, geoPoint: { lat: 2, lon: 20 }, interchange: [], connecting: ["a2"] },
  ];
  const lineA = { name: "Line A", code: "A", color: "#111111", stations: ["a1", "a2"] };
  const lineB = { name: "Line B", code: "B", color: "#222222", stations: ["b1", "b2"] };
  return { stations, lines: [lineA, lineB] };
}

describe("export-network builder", () => {
  it("writes interchange and connecting as network codes, not relation ids", () => {
    const { lines: sourceLines, stations } = fixture();
    const built = buildNetwork(sourceLines, stations);
    const a1 = built[0].stations[0];
    assert.deepEqual(a1.interchange, ["B1"]);
    assert.deepEqual(a1.connecting, []);
    assert.deepEqual(built[0].stations[1].connecting, ["B2"]);
  });

  it("carries every Station with both fields, even when empty", () => {
    const { lines: sourceLines, stations } = fixture();
    const built = buildNetwork(sourceLines, stations);
    for (const line of built) {
      for (const station of line.stations) {
        assert.ok(Array.isArray(station.interchange), `${station.code} interchange missing`);
        assert.ok(Array.isArray(station.connecting), `${station.code} connecting missing`);
      }
    }
  });

  it("is stable: the same input writes byte-for-byte the same output", () => {
    const { lines: sourceLines, stations } = fixture();
    assert.equal(
      JSON.stringify(buildNetwork(sourceLines, stations)),
      JSON.stringify(buildNetwork(sourceLines, stations)),
    );
  });

  it("sorts Stations by their own sort, so fetch order cannot drift the snapshot", () => {
    const { lines: sourceLines, stations } = fixture();
    const shuffled = [...stations].reverse();
    assert.equal(
      JSON.stringify(buildNetwork(sourceLines, stations)),
      JSON.stringify(buildNetwork(sourceLines, shuffled)),
    );
  });

  it("sorts link codes so relation order cannot drift the snapshot", () => {
    const stations = [
      { id: "a1", code: "A1", name: "One", sort: 1, geoPoint: { lat: 1, lon: 10 }, interchange: ["c1", "b1"], connecting: [] },
      { id: "b1", code: "B1", name: "x", sort: 1, geoPoint: { lat: 2, lon: 20 }, interchange: [], connecting: [] },
      { id: "c1", code: "C1", name: "y", sort: 1, geoPoint: { lat: 3, lon: 30 }, interchange: [], connecting: [] },
    ];
    const line = { name: "Line A", code: "A", color: "#111111", stations: ["a1"] };
    const built = buildNetwork([line], stations);
    assert.deepEqual(built[0].stations[0].interchange, ["B1", "C1"]);
  });

  it("fails loudly when a link names a Station that does not exist", () => {
    const stations = [
      { id: "a1", code: "A1", name: "One", sort: 1, geoPoint: { lat: 1, lon: 10 }, interchange: ["ghost"], connecting: [] },
    ];
    const line = { name: "Line A", code: "A", color: "#111111", stations: ["a1"] };
    assert.throws(() => buildNetwork([line], stations), /ghost/);
  });
});

describe("committed network snapshot", () => {
  it("carries both link kinds on every Station, and every link resolves", () => {
    assert.ok(lines.length > 0, "The snapshot must hold Lines");
    const byCode = new Map<string, { line: string; links: string[] }>();
    for (const line of lines) {
      for (const station of line.stations) {
        byCode.set(station.code, { line: line.code, links: [] });
      }
    }
    for (const line of lines) {
      for (const station of line.stations) {
        assert.ok(
          Array.isArray(station.interchange),
          `${station.code} (${line.code}) carries no interchange array`,
        );
        assert.ok(
          Array.isArray(station.connecting),
          `${station.code} (${line.code}) carries no connecting array`,
        );

        const links = [...(station.interchange ?? []), ...(station.connecting ?? [])];
        assert.equal(
          new Set(links).size,
          links.length,
          `${station.code} names the same Station twice`,
        );
        for (const code of links) {
          assert.ok(
            byCode.has(code),
            `${station.code} links to "${code}", which is not a Station on the network`,
          );
          assert.notEqual(code, station.code, `${station.code} links to itself`);
        }
        byCode.get(station.code)!.links = links;
      }
    }
  });
});
