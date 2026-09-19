import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  filterPlaces,
  groupByStation,
  getUniqueTypes,
  type Place,
  type Station,
} from "../app/lib/browse-filter.ts";
import {
  buildRouteFrameUrl,
  buildOpenRouteUrl,
  buildPlacePinUrl,
} from "../app/lib/route-url.ts";

const HTML_PATH = resolve(import.meta.dirname, "../build/client/index.html");
const DATA_PATH = resolve(import.meta.dirname, "../data/properties.json");

function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/g, "");
}

let html: string;
let cleanHtml: string;
let data: { stations: Station[]; places: Place[] };

before(() => {
  html = readFileSync(HTML_PATH, "utf-8");
  cleanHtml = stripComments(html);
  data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
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

  it("contains every Station name with its correct count", () => {
    const stationCounts = new Map<string, number>();
    for (const place of data.places) {
      stationCounts.set(place.station, (stationCounts.get(place.station) ?? 0) + 1);
    }

    for (const station of data.stations) {
      const expectedCount = stationCounts.get(station.slug) ?? 0;
      const escaped = station.name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern = new RegExp(
        `aria-label="${escaped}"[^<]*<div class="sticky[^"]*"><h2[^>]*>.*?\\(\\s*${expectedCount}\\s*\\)`
      );
      assert.ok(
        pattern.test(cleanHtml),
        `Station "${station.name}" with count ${expectedCount} not found in HTML`
      );
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
    const totalCount = data.places.length;
    const groupPattern = /aria-label="[^"]+"><div class="sticky[^"]*"><h2[^>]*>.*?\((\s*\d+\s*)\)/g;
    let sum = 0;
    let match;
    while ((match = groupPattern.exec(cleanHtml)) !== null) {
      sum += parseInt(match[1], 10);
    }
    assert.equal(sum, totalCount, `Expected sum of group counts to equal ${totalCount}, got ${sum}`);
  });

  it("renders all 22 station groups", () => {
    const groupPattern = /role="group" aria-label="(?!Travel mode)/g;
    let count = 0;
    while (groupPattern.exec(cleanHtml) !== null) count++;
    assert.equal(count, 22, `Expected 22 station groups, got ${count}`);
  });

  it("renders all 84 Place rows", () => {
    const rowPattern = /role="listitem"/g;
    let count = 0;
    while (rowPattern.exec(cleanHtml) !== null) count++;
    assert.equal(count, 84, `Expected 84 Place rows, got ${count}`);
  });

  it("contains a station filter select with every Station option", () => {
    assert.ok(cleanHtml.includes('id="station-filter"'), "Station filter select missing");
    for (const station of data.stations) {
      const escaped = station.name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern = new RegExp(`<option[^>]*value="${station.slug}"[^>]*>`);
      assert.ok(
        pattern.test(cleanHtml),
        `Station option "${station.name}" (slug: ${station.slug}) not found in filter`
      );
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

  it("station filter option counts match the data file", () => {
    const stationCounts = new Map<string, number>();
    for (const place of data.places) {
      stationCounts.set(place.station, (stationCounts.get(place.station) ?? 0) + 1);
    }

    for (const station of data.stations) {
      const expectedCount = stationCounts.get(station.slug) ?? 0;
      const escaped = station.name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern = new RegExp(
        `<option[^>]*value="${station.slug}"[^>]*>[^<]*\\(\\s*${expectedCount}\\s*\\)`
      );
      assert.ok(
        pattern.test(cleanHtml),
        `Station option for "${station.name}" should show count ${expectedCount}`
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

  it("contains a sort control", () => {
    assert.ok(cleanHtml.includes('id="sort-mode"'), "Sort control missing");
    assert.ok(cleanHtml.includes("Station order"), "Station order option missing");
    assert.ok(cleanHtml.includes("A–Z"), "A-Z option missing");
    assert.ok(cleanHtml.includes("Most places"), "Most places option missing");
  });

  it("contains no search box", () => {
    assert.ok(!cleanHtml.includes('id="search"'), "Search box should not exist");
    assert.ok(!cleanHtml.includes('type="search"'), "Search input should not exist");
  });
});

describe("pure filter/sort functions", () => {
  const { stations, places } = data;

  describe("filterPlaces", () => {
    it("returns all places when no filters are set", () => {
      const result = filterPlaces(places, "", "");
      assert.equal(result.length, 84);
    });

    it("filters by station", () => {
      const result = filterPlaces(places, "lrt-bangsar", "");
      const expected = places.filter((p) => p.station === "lrt-bangsar").length;
      assert.equal(result.length, expected);
      for (const place of result) {
        assert.equal(place.station, "lrt-bangsar");
      }
    });

    it("filters by type", () => {
      const result = filterPlaces(places, "", "condominium");
      const expected = places.filter((p) => p.type === "condominium").length;
      assert.equal(result.length, expected);
      for (const place of result) {
        assert.equal(place.type, "condominium");
      }
    });

    it("filters by both station and type", () => {
      const result = filterPlaces(places, "lrt-bangsar", "condominium");
      assert.ok(result.length > 0);
      for (const place of result) {
        assert.equal(place.station, "lrt-bangsar");
        assert.equal(place.type, "condominium");
      }
    });

    it("returns empty when no places match both filters", () => {
      const result = filterPlaces(places, "lrt-bangsar", "flat");
      assert.equal(result.length, 0);
    });
  });

  describe("groupByStation", () => {
    it("groups places by station in data-file order (station sort)", () => {
      const filtered = filterPlaces(places, "", "");
      const groups = groupByStation(filtered, stations, "station");

      const groupSlugs = groups.map((g) => g.stationSlug);
      const stationSlugs = stations.map((s) => s.slug);

      for (const slug of groupSlugs) {
        assert.ok(stationSlugs.includes(slug), `Group slug ${slug} not in station list`);
      }
    });

    it("sorts places alphabetically within each group", () => {
      const filtered = filterPlaces(places, "lrt-bangsar", "");
      const groups = groupByStation(filtered, stations, "station");

      const bGroup = groups.find((g) => g.stationSlug === "lrt-bangsar");
      assert.ok(bGroup);
      for (let i = 1; i < bGroup.places.length; i++) {
        assert.ok(
          bGroup.places[i - 1].name.localeCompare(bGroup.places[i].name) <= 0,
          `Places not sorted: ${bGroup.places[i - 1].name} > ${bGroup.places[i].name}`
        );
      }
    });

    it("az sort orders stations alphabetically", () => {
      const filtered = filterPlaces(places, "", "");
      const groups = groupByStation(filtered, stations, "az");

      for (let i = 1; i < groups.length; i++) {
        assert.ok(
          groups[i - 1].stationName.localeCompare(groups[i].stationName) <= 0,
          `Stations not A-Z: ${groups[i - 1].stationName} > ${groups[i].stationName}`
        );
      }
    });

    it("most sort orders stations by count descending", () => {
      const filtered = filterPlaces(places, "", "");
      const groups = groupByStation(filtered, stations, "most");

      for (let i = 1; i < groups.length; i++) {
        assert.ok(
          groups[i - 1].count >= groups[i].count,
          `Groups not by count: ${groups[i - 1].stationName} (${groups[i - 1].count}) < ${groups[i].stationName} (${groups[i].count})`
        );
      }
    });

    it("most sort breaks ties alphabetically", () => {
      const filtered = filterPlaces(places, "", "");
      const groups = groupByStation(filtered, stations, "most");

      for (let i = 1; i < groups.length; i++) {
        if (groups[i - 1].count === groups[i].count) {
          assert.ok(
            groups[i - 1].stationName.localeCompare(groups[i].stationName) <= 0,
            `Tie not broken alphabetically: ${groups[i - 1].stationName} > ${groups[i].stationName}`
          );
        }
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
  const { stations, places } = data;
  const stationNameMap = new Map(stations.map((s) => [s.slug, s.name]));

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
      cleanHtml.includes("Select a place"),
      "Empty state title missing"
    );
    assert.ok(
      cleanHtml.includes("Details will appear here."),
      "Empty state body missing"
    );
  });

  it("contains the Walk/Drive toggle", () => {
    assert.ok(
      cleanHtml.includes('aria-label="Travel mode"'),
      "Travel mode toggle missing"
    );
    assert.ok(
      cleanHtml.includes("Walk"),
      "Walk button missing"
    );
    assert.ok(
      cleanHtml.includes("Drive"),
      "Drive button missing"
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
