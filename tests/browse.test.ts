import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildStationRows,
  filterPlaces,
  getUniqueTypes,
  type Place,
} from "../app/lib/browse-filter.ts";
import { coveredLine, stationNamesByCode, type Line } from "../app/lib/lines.ts";
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
      stationCounts.set(place.station, (stationCounts.get(place.station) ?? 0) + 1);
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
    const withPlaces = new Set(data.places.map((place) => place.station));
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
    assert.equal(
      sum,
      data.places.length,
      `Expected sum of group counts to equal ${data.places.length}, got ${sum}`,
    );
  });

  it("renders a group for every Station holding Places", () => {
    const line = coveredLine(data.lines, data.places);
    const withPlaces = new Set(data.places.map((place) => place.station));
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

  it("renders a row for every Place", () => {
    const rowPattern = /role="listitem"/g;
    let count = 0;
    while (rowPattern.exec(cleanHtml) !== null) count++;
    assert.equal(
      count,
      data.places.length,
      `Expected ${data.places.length} Place rows, got ${count}`,
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
    const withPlaces = new Set(data.places.map((place) => place.station));
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
    const withPlaces = new Set(data.places.map((place) => place.station));
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
    const withPlaces = new Set(data.places.map((place) => place.station));
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
    const withPlaces = new Set(data.places.map((place) => place.station));
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

    it("carries every Place under its Station", () => {
      const rows = buildStationRows(line, places, places);
      const sum = rows.reduce((total, row) => total + row.count, 0);
      assert.equal(sum, places.length);
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
      const withPlaces = new Set(places.map((p) => p.station));
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
      const withPlaces = new Set(places.map((p) => p.station));
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

describe("route URL builders", () => {
  const { lines, places } = data;
  const stationNameMap = stationNamesByCode(lines);

  describe("buildRouteFrameUrl", () => {
    it("uses coordinates as origin when present", () => {
      const place = places.find((p) => p.coordinates)!;
      const stationName = stationNameMap.get(place.station)!;
      const url = buildRouteFrameUrl(place, stationName, "walk");
      const encodedOrigin = encodeURIComponent(`${place.coordinates!.lat},${place.coordinates!.lng}`);
      assert.ok(
        url.includes(encodedOrigin),
        `URL should contain coordinates as origin: ${url}`
      );
      assert.ok(
        url.includes(encodeURIComponent(stationName)),
        `URL should contain station name: ${url}`
      );
      assert.ok(
        url.includes("dirflg=w"),
        `URL should use walk mode: ${url}`
      );
      assert.ok(
        url.includes("output=embed"),
        `URL should use output=embed: ${url}`
      );
      assert.ok(
        url.startsWith("https://maps.google.com/maps"),
        `URL should start with maps.google.com/maps: ${url}`
      );
    });

    it("uses place name as origin when coordinates are absent", () => {
      const place = places.find((p) => !p.coordinates)!;
      const stationName = stationNameMap.get(place.station)!;
      const url = buildRouteFrameUrl(place, stationName, "walk");
      assert.ok(
        url.includes(encodeURIComponent(place.name)),
        `URL should contain place name as origin: ${url}`
      );
      assert.ok(
        url.includes("dirflg=w"),
        `URL should use walk mode: ${url}`
      );
    });

    it("uses dirflg=d for drive mode", () => {
      const place = places.find((p) => p.coordinates)!;
      const stationName = stationNameMap.get(place.station)!;
      const url = buildRouteFrameUrl(place, stationName, "drive");
      assert.ok(
        url.includes("dirflg=d"),
        `URL should use drive mode: ${url}`
      );
    });

    it("produces a valid URL for every Place in the data file", () => {
      for (const place of places) {
        const stationName = stationNameMap.get(place.station)!;
        const walkUrl = buildRouteFrameUrl(place, stationName, "walk");
        const driveUrl = buildRouteFrameUrl(place, stationName, "drive");

        assert.ok(
          walkUrl.startsWith("https://maps.google.com/maps"),
          `Walk URL for "${place.name}" should start with maps.google.com/maps`
        );
        assert.ok(
          walkUrl.includes("dirflg=w"),
          `Walk URL for "${place.name}" should use dirflg=w`
        );
        assert.ok(
          walkUrl.includes("output=embed"),
          `Walk URL for "${place.name}" should include output=embed`
        );
        assert.ok(
          driveUrl.includes("dirflg=d"),
          `Drive URL for "${place.name}" should use dirflg=d`
        );

        if (place.coordinates) {
          assert.ok(
            walkUrl.includes(encodeURIComponent(`${place.coordinates.lat},${place.coordinates.lng}`)),
            `Walk URL for "${place.name}" should contain coordinates`
          );
        } else {
          assert.ok(
            walkUrl.includes(encodeURIComponent(place.name)),
            `Walk URL for "${place.name}" should contain encoded name`
          );
        }
      }
    });
  });

  describe("buildOpenRouteUrl", () => {
    it("uses travelmode=walking for walk mode", () => {
      const place = places.find((p) => p.coordinates)!;
      const stationName = stationNameMap.get(place.station)!;
      const url = buildOpenRouteUrl(place, stationName, "walk");
      assert.ok(
        url.includes("travelmode=walking"),
        `URL should use travelmode=walking: ${url}`
      );
      assert.ok(
        url.startsWith("https://www.google.com/maps/dir/?api=1"),
        `URL should start with google.com/maps/dir/?api=1: ${url}`
      );
    });

    it("uses travelmode=driving for drive mode", () => {
      const place = places.find((p) => p.coordinates)!;
      const stationName = stationNameMap.get(place.station)!;
      const url = buildOpenRouteUrl(place, stationName, "drive");
      assert.ok(
        url.includes("travelmode=driving"),
        `URL should use travelmode=driving: ${url}`
      );
    });

    it("uses coordinates as origin when present, name otherwise", () => {
      const withCoords = places.find((p) => p.coordinates)!;
      const withoutCoords = places.find((p) => !p.coordinates)!;
      const stationName1 = stationNameMap.get(withCoords.station)!;
      const stationName2 = stationNameMap.get(withoutCoords.station)!;

      const url1 = buildOpenRouteUrl(withCoords, stationName1, "walk");
      assert.ok(
        url1.includes(encodeURIComponent(`${withCoords.coordinates!.lat},${withCoords.coordinates!.lng}`)),
        `URL for "${withCoords.name}" should contain coordinates`
      );

      const url2 = buildOpenRouteUrl(withoutCoords, stationName2, "walk");
      assert.ok(
        url2.includes(encodeURIComponent(withoutCoords.name)),
        `URL for "${withoutCoords.name}" should contain name`
      );
    });
  });

  describe("buildPlacePinUrl", () => {
    it("returns the place map link when present", () => {
      const place = places.find((p) => p.map)!;
      const url = buildPlacePinUrl(place);
      assert.equal(url, place.map);
    });

    it("returns a Google Maps search URL when map is absent", () => {
      const place = places.find((p) => !p.map)!;
      const url = buildPlacePinUrl(place);
      assert.ok(
        url.startsWith("https://www.google.com/maps/search/"),
        `URL should start with maps/search: ${url}`
      );
      assert.ok(
        url.includes(encodeURIComponent(place.name)),
        `URL should contain place name: ${url}`
      );
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
