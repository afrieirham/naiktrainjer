import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const HTML_PATH = resolve(import.meta.dirname, "../build/client/index.html");
const DATA_PATH = resolve(import.meta.dirname, "../data/properties.json");

function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/g, "");
}

let html: string;
let cleanHtml: string;
let data: { stations: Array<{ slug: string; name: string; line: string }>; places: Array<{ slug: string; name: string; station: string }> };

before(() => {
  html = readFileSync(HTML_PATH, "utf-8");
  cleanHtml = stripComments(html);
  data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
});

describe("prerendered HTML", () => {
  it("index.html exists and is real HTML (not an empty shell)", () => {
    assert.ok(html.length > 1000, `Expected HTML to be >1000 bytes, got ${html.length}`);
    assert.ok(html.includes("<!DOCTYPE html>"), "Expected DOCTYPE");
    assert.ok(html.includes("<title>NaikTrainJer</title>"), "Expected title");
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
});
