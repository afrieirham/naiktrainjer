import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildStationRows,
  filterPlaces,
  getUniqueTypes,
  placeStations,
  type Place,
} from "../app/lib/browse-filter.ts";
import {
  coverage,
  coveredLine,
  coveredLines,
  stationPlacesByCode,
  selectedLine,
  type Line,
} from "../app/lib/lines.ts";
import {
  buildRouteFrameUrl,
  buildOpenRouteUrl,
  buildPlacePinUrl,
} from "../app/lib/route-url.ts";
import { lines, places } from "../app/data/directory.node.ts";

const BUILD_DIR = resolve(import.meta.dirname, "../build/client");
const HTML_PATH = resolve(BUILD_DIR, "index.html");

function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

/** The name as the prerendered HTML carries it: React escapes the apostrophe. */
function asHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&#x27;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** The Station entries on a Line: a Place with two Connections on it counts twice. */
function linePlaceRows(places: Place[], line: Line): number {
  const codes = new Set(line.stations.map((station) => station.code));
  return places.reduce(
    (total, place) =>
      total + placeStations(place).filter((code) => codes.has(code)).length,
    0,
  );
}

let html: string;
let cleanHtml: string;
let data: { lines: Line[]; places: Place[] };

before(() => {
  html = readFileSync(HTML_PATH, "utf-8");
  cleanHtml = stripComments(html);
  data = { lines, places };
});

describe("prerendered HTML", () => {
  it("index.html exists and is real HTML (not an empty shell)", () => {
    assert.ok(html.length > 1000, `Expected HTML to be >1000 bytes, got ${html.length}`);
    assert.ok(html.includes("<!DOCTYPE html>"), "Expected DOCTYPE");
    const titles = [...html.matchAll(/<title[^>]*>(.*?)<\/title>/g)].map((m) => m[1]);
    assert.equal(titles.length, 1, `Expected exactly one <title>, got ${titles.length}: ${titles.join(" | ")}`);
    assert.ok(titles[0].includes("NaikTrainJer"), `Expected the title to name the site, got "${titles[0]}"`);
    const descriptions = [...html.matchAll(/<meta name="description" content="(.*?)"/g)].map((m) => m[1]);
    assert.equal(descriptions.length, 1, `Expected exactly one meta description, got ${descriptions.length}`);
  });

  it("names every Station on the Line with its correct count", () => {
    const line = coveredLine(data.lines, data.places);
    const stationCounts = new Map<string, number>();
    for (const place of data.places) {
      for (const code of placeStations(place)) {
        stationCounts.set(code, (stationCounts.get(code) ?? 0) + 1);
      }
    }

    for (const station of line.stations) {
      const expectedCount = stationCounts.get(station.code) ?? 0;
      const name = asHtmlText(station.name);
      if (expectedCount > 0) {
        const start = cleanHtml.indexOf(`aria-label="${name}"`);
        assert.ok(start > -1, `Station "${station.name}" not found in HTML`);
        const block = cleanHtml.slice(start, start + 400);
        assert.ok(
          block.includes(`data-station-count="${expectedCount}"`),
          `Station "${station.name}" should carry count ${expectedCount}`,
        );
      } else {
        const start = cleanHtml.indexOf(`data-station-code="${station.code}"`);
        assert.ok(start > -1, `Station "${station.name}" not found in HTML`);
        const block = cleanHtml.slice(start, start + 400);
        assert.ok(
          block.includes(name),
          `Station "${station.name}" should be named in its empty row`,
        );
        assert.ok(
          block.includes("No places yet"),
          `Station "${station.name}" should be marked "No places yet"`,
        );
      }
    }
  });

  it("contains every Place name", () => {
    for (const place of data.places) {
      assert.ok(
        cleanHtml.includes(place.name),
        `Place "${place.name}" not found in HTML`
      );
    }
  });

  it("sum of group counts equals number of Places", () => {
    const line = coveredLine(data.lines, data.places);
    const withPlaces = new Set(data.places.flatMap((place) => placeStations(place)));
    const coveredStations = line.stations.filter((station) =>
      withPlaces.has(station.code),
    ).length;
    const counts = [...cleanHtml.matchAll(/data-station-count="(\d+)"/g)].map((match) =>
      parseInt(match[1], 10),
    );
    assert.equal(
      counts.length,
      coveredStations,
      "Every Station holding Places should carry its count",
    );
    const sum = counts.reduce((total, count) => total + count, 0);
    const expected = linePlaceRows(data.places, line);
    assert.equal(
      sum,
      expected,
      `Expected sum of group counts to equal the Line's ${expected} station entries, got ${sum}`,
    );
  });

  it("renders a group for every Station holding Places", () => {
    const line = coveredLine(data.lines, data.places);
    const withPlaces = new Set(data.places.flatMap((place) => placeStations(place)));
    const covered = line.stations.filter((station) =>
      withPlaces.has(station.code),
    ).length;
    const groupPattern = /role="group" aria-label="(?!Travel mode)/g;
    let count = 0;
    while (groupPattern.exec(cleanHtml) !== null) count++;
    assert.equal(
      count,
      covered,
      `Expected ${covered} Station groups, got ${count}`,
    );
  });

  it("renders a row for every Place on the Line", () => {
    const line = coveredLine(data.lines, data.places);
    const rowPattern = /role="listitem"/g;
    let count = 0;
    while (rowPattern.exec(cleanHtml) !== null) count++;
    const expected = linePlaceRows(data.places, line);
    assert.equal(
      count,
      expected,
      `Expected ${expected} Place rows, got ${count}`,
    );
  });

  it("contains no station filter", () => {
    assert.ok(
      !cleanHtml.includes('id="station-filter"'),
      "The Station filter is gone: a Station is navigation within the corridor, not a filter",
    );
    assert.ok(
      !cleanHtml.includes("All stations"),
      "No Station filter option may remain",
    );
  });

  it("renders every Station on the Line, in corridor order", () => {
    const line = coveredLine(data.lines, data.places);
    const withPlaces = new Set(data.places.flatMap((place) => placeStations(place)));
    const expected = [...line.stations]
      .sort((a, b) => b.sort - a.sort)
      .map((station) => (withPlaces.has(station.code) ? station.name : station.code));

    const marker = /role="group" aria-label="([^"]+)"|data-station-code="([A-Za-z0-9]+)"/g;
    const rendered: string[] = [];
    for (const match of cleanHtml.matchAll(marker)) {
      const name = match[1] ?? match[2];
      if (name === "Travel mode") continue;
      rendered.push(name);
    }

    assert.deepEqual(
      rendered,
      expected,
      "Every Station on the Line must render, in the Line's own order",
    );
  });

  it("marks every Station with no Places as 'No places yet'", () => {
    const line = coveredLine(data.lines, data.places);
    const withPlaces = new Set(data.places.flatMap((place) => placeStations(place)));
    const empty = line.stations.filter((station) => !withPlaces.has(station.code));
    assert.ok(empty.length > 0, "This assertion is meaningless with no empty Station");

    const marks = [...cleanHtml.matchAll(/No places yet/g)];
    assert.equal(
      marks.length,
      empty.length,
      `Expected ${empty.length} "No places yet" markers, got ${marks.length}`,
    );

    for (const station of empty) {
      const pattern = new RegExp(
        `data-station-code="${station.code}"[^>]*>[\\s\\S]{0,320}?${escapeRegExp(asHtmlText(station.name))}`,
      );
      assert.ok(
        pattern.test(cleanHtml),
        `Station with no Places "${station.name}" (${station.code}) must be named on the page`,
      );
    }
  });

  it("keeps a Station with no Places non-interactive", () => {
    const line = coveredLine(data.lines, data.places);
    const withPlaces = new Set(data.places.flatMap((place) => placeStations(place)));
    const empty = line.stations.filter((station) => !withPlaces.has(station.code));

    const firstRow = cleanHtml.indexOf('data-station-empty="true"');
    const asideEnd = cleanHtml.indexOf('aria-label="Place details"');
    assert.ok(firstRow > -1 && asideEnd > firstRow, "The empty Stations are missing from the list");

    const rows = cleanHtml
      .slice(firstRow, asideEnd)
      .split('data-station-empty="true"')
      .slice(1);
    assert.equal(rows.length, empty.length, "One row per Station with no Places");

    for (const row of rows) {
      assert.ok(!row.includes("<button"), `A Station with no Places row must not be a button`);
      assert.ok(!row.includes("<a "), `A Station with no Places row must not link anywhere`);
    }
  });

  it("gives a Station with no Places no page of its own", () => {
    const line = coveredLine(data.lines, data.places);
    const withPlaces = new Set(data.places.flatMap((place) => placeStations(place)));
    const empty = line.stations.filter((station) => !withPlaces.has(station.code));

    assert.ok(
      !existsSync(resolve(BUILD_DIR, "stations")),
      "Stations must not have a route, let alone a prerendered page",
    );
    for (const station of empty) {
      const slug = station.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      for (const path of [station.code.toLowerCase(), `stations/${slug}`]) {
        assert.ok(
          !existsSync(resolve(BUILD_DIR, path)),
          `"${path}" must not be prerendered — a page that promises nothing is worse than no page`,
        );
      }
    }
  });

  it("contains a type filter select with every Type option", () => {
    assert.ok(cleanHtml.includes('id="type-filter"'), "Type filter select missing");
    const uniqueTypes = [...new Set(data.places.map((p) => p.type))].sort();
    for (const type of uniqueTypes) {
      const escaped = type.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern = new RegExp(`<option[^>]*value="${escaped}"[^>]*>`);
      assert.ok(
        pattern.test(cleanHtml),
        `Type option "${type}" not found in filter`
      );
    }
  });

  it("type filter option counts match the data file", () => {
    const typeCounts = new Map<string, number>();
    for (const place of data.places) {
      typeCounts.set(place.type, (typeCounts.get(place.type) ?? 0) + 1);
    }

    const uniqueTypes = [...new Set(data.places.map((p) => p.type))].sort();
    for (const type of uniqueTypes) {
      const expectedCount = typeCounts.get(type) ?? 0;
      const escaped = type.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern = new RegExp(
        `<option[^>]*value="${escaped}"[^>]*>[^<]*\\(\\s*${expectedCount}\\s*\\)`
      );
      assert.ok(
        pattern.test(cleanHtml),
        `Type option for "${type}" should show count ${expectedCount}`
      );
    }
  });

  it("offers no sort control — the corridor's own order is the only order", () => {
    assert.ok(!cleanHtml.includes('id="sort-mode"'), "Sort control should not exist");
    assert.ok(!cleanHtml.includes("Most places"), "No sort options should render");
  });

  it("offers a Line selector offering only the covered Lines", () => {
    assert.ok(cleanHtml.includes('id="line-selector"'), "Line selector missing");

    const covered = coveredLines(data.lines, data.places);
    assert.ok(covered.length > 0, "There must be at least one covered Line");
    for (const line of covered) {
      assert.ok(
        new RegExp(`<option[^>]*value="${escapeRegExp(line.slug)}"`).test(cleanHtml),
        `Covered Line "${line.slug}" must be offered`,
      );
    }

    for (const line of data.lines.filter((candidate) => !covered.includes(candidate))) {
      assert.ok(
        !new RegExp(`<option[^>]*value="${escapeRegExp(line.slug)}"`).test(cleanHtml),
        `Uncovered Line "${line.slug}" must not be offered`,
      );
    }
  });

  it("defaults to the covered Line holding the most Places", () => {
    const withPlaces = new Set(data.places.flatMap((place) => placeStations(place)));
    const counts = coveredLines(data.lines, data.places).map((line) => ({
      line,
      count: line.stations.filter((station) => withPlaces.has(station.code)).length,
    }));
    const most = Math.max(...counts.map((entry) => entry.count));
    const defaultLine = selectedLine(data.lines, data.places, null);

    assert.equal(
      counts.find((entry) => entry.line.slug === defaultLine.slug)?.count,
      most,
      "The default Line must hold the most Places",
    );
    assert.ok(
      cleanHtml.includes(`${defaultLine.name} line`),
      `The default ${defaultLine.name} line must render on no param`,
    );
  });

  it("contains no search box", () => {
    assert.ok(!cleanHtml.includes('id="search"'), "Search box should not exist");
    assert.ok(!cleanHtml.includes('type="search"'), "Search input should not exist");
  });

  it("shows no walk or drive figure", () => {
    assert.ok(
      !cleanHtml.includes("Walk / drive"),
      "The detail panel must not carry a walk figure block",
    );
    assert.ok(!cleanHtml.includes("min walk"), "No walk figure may render");
    assert.ok(!cleanHtml.includes("min drive"), "No drive figure may render");
  });
});

describe("pure filter/corridor functions", () => {
  const { lines, places } = data;
  const line = coveredLine(lines, places);

  describe("filterPlaces", () => {
    it("returns all places when no filter is set", () => {
      const result = filterPlaces(places, "");
      assert.equal(result.length, 84);
    });

    it("filters by type", () => {
      const result = filterPlaces(places, "condominium");
      const expected = places.filter((p) => p.type === "condominium").length;
      assert.equal(result.length, expected);
      for (const place of result) {
        assert.equal(place.type, "condominium");
      }
    });

    it("returns empty when no place has the type", () => {
      const result = filterPlaces(places, "castle");
      assert.equal(result.length, 0);
    });
  });

  describe("buildStationRows", () => {
    it("renders every Station on the Line in corridor order", () => {
      const rows = buildStationRows(line, places, places);
      const corridor = [...line.stations]
        .sort((a, b) => b.sort - a.sort)
        .map((s) => s.code);
      assert.equal(rows.length, line.stations.length);
      assert.deepEqual(rows.map((r) => r.code), corridor);
    });

    it("carries every Place under each Station it Connects to", () => {
      const rows = buildStationRows(line, places, places);
      const sum = rows.reduce((total, row) => total + row.count, 0);
      assert.equal(sum, linePlaceRows(places, line));
    });

    it("sorts places alphabetically within a Station", () => {
      const rows = buildStationRows(line, places, places);
      for (const row of rows) {
        for (let i = 1; i < row.places.length; i++) {
          assert.ok(
            row.places[i - 1].name.localeCompare(row.places[i].name) <= 0,
            `Places not sorted: ${row.places[i - 1].name} > ${row.places[i].name}`,
          );
        }
      }
    });

    it("marks every Station with no Places", () => {
      const rows = buildStationRows(line, places, places);
      const withPlaces = new Set(places.flatMap((p) => placeStations(p)));
      const empty = rows.filter((row) => row.count === 0);
      assert.deepEqual(
        empty.map((row) => row.code),
        line.stations
          .filter((s) => !withPlaces.has(s.code))
          .sort((a, b) => b.sort - a.sort)
          .map((s) => s.code),
      );
      for (const row of empty) {
        assert.equal(row.places.length, 0);
      }
    });

    it("drops a Station the filter emptied, but keeps one the data holds nothing for", () => {
      const empty = filterPlaces(places, "castle");
      const rows = buildStationRows(line, places, empty);
      const withPlaces = new Set(places.flatMap((p) => placeStations(p)));
      assert.equal(
        rows.filter((row) => withPlaces.has(row.code)).length,
        0,
        "A Station emptied by the filter is not shown",
      );

      const emptyStations = line.stations.filter((s) => !withPlaces.has(s.code));
      assert.equal(
        rows.length,
        emptyStations.length,
        "Only the Stations the data holds nothing for remain",
      );

      const noDataRows = buildStationRows(line, [], []);
      assert.equal(
        noDataRows.length,
        line.stations.length,
        "A Station the data holds nothing for stays on the page",
      );
      for (const row of noDataRows) {
        assert.equal(row.count, 0);
      }
    });
  });

  describe("getUniqueTypes", () => {
    it("returns all unique types from the data", () => {
      const types = getUniqueTypes(places);
      const expected = [...new Set(places.map((p) => p.type))].sort();
      assert.deepEqual(types, expected);
    });
  });
});

describe("line selection", () => {
  it("returns only the Lines that hold a Place, in network order", () => {
    const covered = coveredLines(lines, places);
    const reached = new Set(stationPlacesByCode(lines, places).keys());
    const expected = lines.filter((line) =>
      line.stations.some((station) => reached.has(station.code)),
    );
    assert.deepEqual(
      covered.map((line) => line.slug),
      expected.map((line) => line.slug),
    );
    for (const line of covered) {
      assert.ok(
        line.stations.some((station) => reached.has(station.code)),
        `"${line.slug}" is offered without a Place`,
      );
    }
  });

  it("offers a Line a Place only reaches by derivation, but does not count it as coverage", () => {
    const coveredSlugs = coveredLines(lines, places).map((line) => line.slug);
    assert.ok(
      coveredSlugs.includes("shah-alam"),
      "The Shah Alam line holds Also-near placements of Glenmarie places",
    );
    const shahAlam = lines.find((line) => line.slug === "shah-alam")!;
    const trueCodes = new Set(places.flatMap((place) => placeStations(place)));
    const trueStations = shahAlam.stations.filter((station) =>
      trueCodes.has(station.code),
    ).length;
    assert.equal(
      coverage(shahAlam, places).coveredCount,
      trueStations,
      "Coverage must still count true Connections only",
    );
  });

  /**
   * The real network carries Lines nobody has covered yet, so a two-Line
   * fixture is the only way to exercise a switch between covered Lines.
   */
  const lineA: Line = {
    slug: "line-a",
    code: "A",
    name: "Line A",
    color: "#111111",
    stations: [
      { code: "A1", name: "A One", sort: 1 },
      { code: "A2", name: "A Two", sort: 2 },
    ],
  };
  const lineB: Line = {
    slug: "line-b",
    code: "B",
    name: "Line B",
    color: "#222222",
    stations: [
      { code: "B1", name: "B One", sort: 1 },
      { code: "B2", name: "B Two", sort: 2 },
    ],
  };
  const lineC: Line = {
    slug: "line-c",
    code: "C",
    name: "Line C",
    color: "#333333",
    stations: [{ code: "C1", name: "C One", sort: 1 }],
  };
  const network: Line[] = [lineA, lineB, lineC];
  function fixture(
    slug: string,
    name: string,
    type: string,
    station: string,
  ): Place {
    return {
      slug,
      name,
      kind: "building",
      type,
      map: "https://maps.app.goo.gl/x",
      connections: [{ station, embed: null }],
    };
  }

  const fixturePlaces: Place[] = [
    fixture("a-one", "A One Place", "condominium", "A1"),
    fixture("a-two", "A Two Place", "apartment", "A2"),
    fixture("b-one", "B One Place", "flat", "B1"),
  ];

  it("defaults to the covered Line with the most Places, on network-order tie-break", () => {
    assert.equal(coveredLine(network, fixturePlaces).slug, "line-a");
  });

  it("?line= selects that Line, and its whole corridor is built from it", () => {
    const url = new URL("https://naiktrainjer.com/?line=line-b");
    const selected = selectedLine(network, fixturePlaces, url.searchParams.get("line"));
    assert.equal(selected.slug, "line-b");

    const rows = buildStationRows(selected, fixturePlaces, fixturePlaces);
    assert.deepEqual(rows.map((row) => row.code), ["B2", "B1"]);
  });

  it("an unknown param falls back to the default", () => {
    const url = new URL("https://naiktrainjer.com/?line=line-does-not-exist");
    assert.equal(
      selectedLine(network, fixturePlaces, url.searchParams.get("line")).slug,
      "line-a",
    );
  });

  it("a blank or missing param falls back to the default", () => {
    assert.equal(selectedLine(network, fixturePlaces, "").slug, "line-a");
    assert.equal(selectedLine(network, fixturePlaces, null).slug, "line-a");
    assert.equal(selectedLine(network, fixturePlaces, undefined).slug, "line-a");
  });

  it("never selects a Line with no Places, even when named", () => {
    assert.equal(selectedLine(network, fixturePlaces, "line-c").slug, "line-a");
  });
});

describe("route URL builders", () => {
  const { lines, places } = data;

  /** A Place whose one Connection carries the given stored Route frame. */
  function placeWithEmbed(embed: string | null): Place {
    return {
      slug: "embedded",
      name: "Embedded Place",
      kind: "building",
      type: "condominium",
      map: "https://maps.app.goo.gl/place",
      connections: [{ station: "KJ20", embed }],
    };
  }

  describe("buildRouteFrameUrl", () => {
    it("returns the Connection's stored Route frame for the viewed Station", () => {
      const embed = "https://www.google.com/maps/embed?pb=!3e2!walk";
      const url = buildRouteFrameUrl(placeWithEmbed(embed), "KJ20", "walk");
      assert.equal(url, embed);
    });

    it("derives the driving view from the same stored link", () => {
      const embed = "https://www.google.com/maps/embed?pb=!3e2!walk";
      const url = buildRouteFrameUrl(placeWithEmbed(embed), "KJ20", "drive");
      assert.equal(url, embed.replace("!3e2", "!3e0"));
    });

    it("presents the walk mode even when the stored link carries another mode", () => {
      const stored = "https://www.google.com/maps/embed?pb=!3e0!drive";
      assert.equal(
        buildRouteFrameUrl(placeWithEmbed(stored), "KJ20", "walk"),
        stored.replace("!3e0", "!3e2"),
      );
      assert.equal(buildRouteFrameUrl(placeWithEmbed(stored), "KJ20", "drive"), stored);
    });

    it("is null when the Connection has no frame, so the Map link is never framed", () => {
      const place = placeWithEmbed(null);
      assert.equal(buildRouteFrameUrl(place, "KJ20", "walk"), null);
      assert.equal(buildRouteFrameUrl(place, "KJ20", "drive"), null);
    });

    it("is null for a Station the Place does not connect to", () => {
      const place = placeWithEmbed(null);
      assert.equal(buildRouteFrameUrl(place, "AG1", "walk"), null);
    });

    it("resolves a frame for every Station in the real data, or none when no frame is stored", () => {
      for (const place of places) {
        for (const connection of place.connections) {
          assert.equal(
            buildRouteFrameUrl(place, connection.station, "walk"),
            connection.embed ?? null,
            `Frame for "${place.name}" must be the stored link, or null when none is stored`,
          );
        }
      }
    });
  });

  describe("buildOpenRouteUrl", () => {
    it("uses travelmode=walking for walk mode, from the Place's name", () => {
      const place = places[0];
      const url = buildOpenRouteUrl(place, "KLCC", "walk");
      assert.ok(url.includes("travelmode=walking"), `walk mode: ${url}`);
      assert.ok(url.startsWith("https://www.google.com/maps/dir/?api=1"));
      assert.ok(url.includes(encodeURIComponent(place.name)));
    });

    it("uses travelmode=driving for drive mode", () => {
      const url = buildOpenRouteUrl(places[0], "KLCC", "drive");
      assert.ok(url.includes("travelmode=driving"), `drive mode: ${url}`);
    });
  });

  describe("buildPlacePinUrl", () => {
    it("returns the Place's required Map link", () => {
      for (const place of places) {
        assert.equal(buildPlacePinUrl(place), place.map);
      }
    });
  });
});

describe("prerendered HTML — route frame", () => {
  it("contains the empty state before a Place is selected", () => {
    assert.ok(
      cleanHtml.includes("Pick a place from the corridor"),
      "Empty state prompt missing"
    );
    assert.ok(
      cleanHtml.includes("walk or drive route appears here"),
      "Empty state must say what will appear"
    );
  });

  it("offers walk and drive, and holds the toggle until a Place is picked", () => {
    assert.ok(
      cleanHtml.includes("walk or drive route"),
      "The empty state must name both travel modes"
    );
    assert.ok(
      !cleanHtml.includes('aria-label="Travel mode"'),
      "The travel mode toggle must not render before a Place is picked — with no route it changes nothing visible"
    );
  });

  it("contains no Google API key", () => {
    assert.ok(
      !cleanHtml.includes("key="),
      "No API key should appear in HTML"
    );
    assert.ok(
      !cleanHtml.includes("GOOGLE_MAPS_API"),
      "No API key reference should appear in HTML"
    );
  });
});
