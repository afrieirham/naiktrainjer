import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPlaces } from "../scripts/export-places.mjs";

/**
 * PocketBase stores a Connection's Station as a relation id. These fixtures
 * mirror that shape: a place record carries an `id`, a connection carries
 * `place` and `station` ids, and a station carries its network `code`.
 */
function fixture() {
  const stationRecords = [
    { id: "k1", code: "KJ26" },
    { id: "k2", code: "KJ20" },
    { id: "k3", code: "BRT1" },
  ];
  const placeRecords = [
    {
      id: "p1",
      slug: "ara-sentral",
      name: "Ara Sentral",
      kind: "building",
      type: "condominium",
      map: "https://maps.example/ara",
      source: "owner",
      contributor_name: "",
      contributor_href: "",
    },
  ];
  const connectionRecords = [
    { id: "c1", place: "p1", station: "k1", embed: "" },
  ];
  return { placeRecords, connectionRecords, stationRecords };
}

describe("export-places builder", () => {
  it("resolves a Connection's station relation id to a network code", () => {
    const { placeRecords, connectionRecords, stationRecords } = fixture();
    const built = buildPlaces(placeRecords, connectionRecords, stationRecords);
    assert.equal(built[0].connections[0].station, "KJ26");
  });

  it("carries embed when present and omits it when empty", () => {
    const { placeRecords, stationRecords } = fixture();
    const withEmbed = [{ id: "c1", place: "p1", station: "k1", embed: "https://maps.example/embed" }];
    const built = buildPlaces(placeRecords, withEmbed, stationRecords);
    assert.equal(built[0].connections[0].embed, "https://maps.example/embed");

    const empty = [{ id: "c1", place: "p1", station: "k1", embed: "" }];
    const builtEmpty = buildPlaces(placeRecords, empty, stationRecords);
    assert.equal("embed" in builtEmpty[0].connections[0], false);
  });

  it("nests the contributor when contributor_name is present and omits it otherwise", () => {
    const { connectionRecords, stationRecords } = fixture();
    const withContributor = [
      {
        id: "p1",
        slug: "ara-sentral",
        name: "Ara Sentral",
        kind: "building",
        type: "condominium",
        map: "https://maps.example/ara",
        source: "contributed",
        contributor_name: "Afrie",
        contributor_href: "https://example.com/afrie",
      },
    ];
    const built = buildPlaces(withContributor, connectionRecords, stationRecords);
    assert.deepEqual(built[0].contributor, {
      name: "Afrie",
      href: "https://example.com/afrie",
    });

    const { placeRecords } = fixture();
    const without = buildPlaces(placeRecords, connectionRecords, stationRecords);
    assert.equal("contributor" in without[0], false);
  });

  it("gives a null href when the contributor has a name but no link", () => {
    const { connectionRecords, stationRecords } = fixture();
    const placeRecords = [
      {
        id: "p1",
        slug: "ara-sentral",
        name: "Ara Sentral",
        kind: "building",
        type: "condominium",
        map: "https://maps.example/ara",
        source: "contributed",
        contributor_name: "Afrie",
        contributor_href: "",
      },
    ];
    const built = buildPlaces(placeRecords, connectionRecords, stationRecords);
    assert.deepEqual(built[0].contributor, { name: "Afrie", href: null });
  });

  it("preserves the order of the Connections it is given, so `sort` still headlines the Place", () => {
    const { placeRecords, stationRecords } = fixture();
    const connectionRecords = [
      { id: "c1", place: "p1", station: "k3", embed: "" },
      { id: "c2", place: "p1", station: "k1", embed: "" },
      { id: "c3", place: "p1", station: "k2", embed: "" },
    ];
    const built = buildPlaces(placeRecords, connectionRecords, stationRecords);
    assert.deepEqual(
      built[0].connections.map((c) => c.station),
      ["BRT1", "KJ26", "KJ20"],
    );
  });

  it("sorts Places by slug, so fetch order cannot drift the snapshot", () => {
    const stationRecords = [{ id: "k1", code: "KJ26" }];
    const connectionRecords = [{ id: "c1", place: "pa", station: "k1", embed: "" }];
    const make = (id: string, slug: string) => ({
      id,
      slug,
      name: slug,
      kind: "building",
      type: "condominium",
      map: "https://maps.example/x",
      source: "owner",
      contributor_name: "",
      contributor_href: "",
    });
    const forward = [make("pa", "alpha"), make("pz", "zulu")];
    const built = buildPlaces(forward, connectionRecords, stationRecords);
    assert.deepEqual(
      built.map((p) => p.slug),
      ["alpha", "zulu"],
    );
    const reversed = buildPlaces([...forward].reverse(), connectionRecords, stationRecords);
    assert.deepEqual(
      reversed.map((p) => p.slug),
      ["alpha", "zulu"],
    );
  });

  it("is stable: the same input writes byte-for-byte the same output", () => {
    const { placeRecords, connectionRecords, stationRecords } = fixture();
    assert.equal(
      JSON.stringify(buildPlaces(placeRecords, connectionRecords, stationRecords)),
      JSON.stringify(buildPlaces(placeRecords, connectionRecords, stationRecords)),
    );
  });

  it("is deterministic regardless of fetch order", () => {
    const { placeRecords, connectionRecords, stationRecords } = fixture();
    assert.equal(
      JSON.stringify(buildPlaces(placeRecords, connectionRecords, stationRecords)),
      JSON.stringify(
        buildPlaces(
          [...placeRecords].reverse(),
          [...connectionRecords].reverse(),
          [...stationRecords].reverse(),
        ),
      ),
    );
  });

  it("fails loudly when a Connection names a Station that does not exist", () => {
    const { placeRecords, connectionRecords, stationRecords } = fixture();
    const bad = [{ id: "c1", place: "p1", station: "ghost", embed: "" }];
    assert.throws(
      () => buildPlaces(placeRecords, bad, stationRecords),
      /ghost/,
    );
  });
});
