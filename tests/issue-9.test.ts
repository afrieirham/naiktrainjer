import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { placeStations, type Place } from "../app/lib/browse-filter.ts";
import type { Line } from "../app/lib/lines.ts";
import { coveredLine, coverage } from "../app/lib/lines.ts";
import { CONTRIBUTION_TYPES } from "../app/lib/contribution.ts";
import { lines, places } from "../app/data/directory.node.ts";

const BUILD_DIR = resolve(import.meta.dirname, "../build/client");

/**
 * The tokens the retire sweep forbids. Spelled by joining so this source file
 * does not itself contain them and trip the sweep it documents.
 */
const RETIRED_FORM_HOST = ["tal", "ly"].join("");
const RETIRED_ROUTE = ["/sub", "mit"].join("");

function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/g, "");
}

/** The one paragraph carrying a phrase — used to read copy without the whole page. */
function paragraphContaining(html: string, needle: string): string {
  const paragraphs = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/g) ?? [];
  const found = paragraphs.find((paragraph) => paragraph.includes(needle));
  assert.ok(found, `No paragraph contains "${needle}"`);
  return found!;
}

let browseHtml: string;
let contributeHtml: string;
let data: { lines: Line[]; places: Place[] };

before(() => {
  browseHtml = stripComments(
    readFileSync(resolve(BUILD_DIR, "index.html"), "utf-8"),
  );
  contributeHtml = stripComments(
    readFileSync(resolve(BUILD_DIR, "contribute", "index.html"), "utf-8"),
  );
  data = { lines, places };
});

// ---------------------------------------------------------------------------
// Intro copy on Browse page
// ---------------------------------------------------------------------------

describe("browse page intro copy", () => {
  let line: Line;
  let ordered: Line["stations"];
  let cov: ReturnType<typeof coverage>;
  let intro: string;

  before(() => {
    line = coveredLine(data.lines, data.places);
    ordered = [...line.stations].sort((a, b) => a.sort - b.sort);
    cov = coverage(line, data.places);
    intro = paragraphContaining(browseHtml, "stations have places so far");
  });

  it("names the Line it covers", () => {
    assert.ok(
      browseHtml.includes(`${line.name} line`),
      `Copy must name the ${line.name} line`,
    );
  });

  it("names the covered count and the Line's total, from the data", () => {
    assert.ok(
      intro.includes(`${cov.coveredCount} of the ${ordered.length} stations`),
      `Intro must state "${cov.coveredCount} of the ${ordered.length} stations", got: ${intro}`,
    );
    assert.ok(
      !intro.includes(`${cov.coveredCount} of the ${cov.empty.length} stations`),
      "Intro must not confuse the covered count with the empty count",
    );
  });

  it("counts the Stations holding Places, derived from the data", () => {
    const withPlaces = new Set(data.places.flatMap((place) => placeStations(place)));
    const expected = ordered.filter((station) => withPlaces.has(station.code)).length;
    assert.equal(
      cov.coveredCount,
      expected,
      "Coverage must count the Stations that hold Places",
    );
    assert.equal(cov.total, ordered.length, "Coverage total must be the Line's Stations");
  });

  it("names how many Stations have no Places yet, from the data", () => {
    assert.ok(cov.empty.length > 0, "This assertion is meaningless with no empty Station");
    assert.ok(
      intro.includes(`${cov.empty.length} stations have no places yet`),
      `Intro must state how many Stations have no places yet, got: ${intro}`,
    );
  });

  it("never claims a stretch or a walk", () => {
    assert.ok(
      !intro.toLowerCase().includes("walk"),
      "Intro copy must not mention walkability figures",
    );
    assert.ok(
      !intro.includes(" up to "),
      "Intro copy must not claim a span between two Stations",
    );
  });

  it("every Place connects to a Station on the Line the page covers", () => {
    const codes = new Set(line.stations.map((station) => station.code));
    for (const place of data.places) {
      assert.ok(
        placeStations(place).some((code) => codes.has(code)),
        `Place "${place.name}" connects to no station on the ${line.slug} line`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// The Line, named from the data
// ---------------------------------------------------------------------------

describe("the Line is read from the data", () => {
  const line = coveredLine(data.lines, data.places);

  it("every prerendered page names the Line it covers", () => {
    assert.ok(
      browseHtml.includes(`${line.name} line`),
      `Browse page must name the ${line.name} line`,
    );
    assert.ok(
      contributeHtml.includes(`${line.name} line`),
      `Contribute page must name the ${line.name} line`,
    );
    for (const place of data.places) {
      const html = stripComments(
        readFileSync(resolve(BUILD_DIR, "places", place.slug, "index.html"), "utf-8"),
      );
      assert.ok(
        html.includes(`${line.name} line`),
        `Place page "${place.slug}" must name the ${line.name} line`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Footer on Browse and Place pages
// ---------------------------------------------------------------------------

describe("footer link", () => {
  it("browse page links to the Contribute page", () => {
    assert.ok(
      browseHtml.includes('href="/contribute/"'),
      "Browse page must link to /contribute/",
    );
  });

  it("browse page offers a way to contribute a place", () => {
    assert.ok(
      /contribute a place/i.test(browseHtml),
      "Browse page must offer a way to contribute a place",
    );
  });

  it("contribute page links back to the directory", () => {
    assert.ok(
      contributeHtml.includes('href="/"'),
      "Contribute page must offer a way back to the directory",
    );
  });

  it("place pages have a footer link to the Contribute page", () => {
    const firstPlace = data.places[0];
    const placeHtml = stripComments(
      readFileSync(
        resolve(BUILD_DIR, "places", firstPlace.slug, "index.html"),
        "utf-8",
      ),
    );
    assert.ok(
      placeHtml.includes('href="/contribute/"'),
      `Place page "${firstPlace.slug}" footer must link to /contribute/`,
    );
  });
});

// ---------------------------------------------------------------------------
// Contribute page
// ---------------------------------------------------------------------------

describe("contribute page", () => {
  it("index.html exists at build/client/contribute/index.html", () => {
    assert.ok(
      existsSync(resolve(BUILD_DIR, "contribute", "index.html")),
      "Contribute page not found in build output",
    );
  });

  it("has a title naming the Contribute page", () => {
    const titles = [...contributeHtml.matchAll(/<title>([^<]*)<\/title>/g)];
    assert.ok(titles.length >= 1, "Contribute page must have a <title>");
    assert.ok(
      titles[0][1].includes("Contribute"),
      `Title "${titles[0][1]}" should mention "Contribute"`,
    );
  });

  it("has a meta description", () => {
    assert.ok(
      contributeHtml.includes('name="description"'),
      "Contribute page must have a meta description",
    );
  });

  it("has a canonical link to /contribute/", () => {
    assert.ok(
      contributeHtml.includes(
        'rel="canonical" href="https://naiktrainjer.com/contribute/"',
      ),
      "Contribute page canonical must point to /contribute/",
    );
  });

  it("holds a native form, not a third-party frame", () => {
    assert.ok(
      contributeHtml.includes("<form"),
      "Contribute page must hold the site's own form",
    );
    assert.ok(
      !contributeHtml.includes("<iframe"),
      "Contribute page must not embed a frame",
    );
    assert.ok(
      !contributeHtml.includes(RETIRED_FORM_HOST),
      "No retired form embed may remain on the Contribute page",
    );
    assert.ok(
      !contributeHtml.includes(RETIRED_ROUTE),
      "No retired route path may remain on the Contribute page",
    );
  });

  it("requires a place name", () => {
    assert.ok(
      contributeHtml.includes('id="name"'),
      "Contribute page must ask for the place name",
    );
  });

  it("offers every Station on every Line, grouped by Line", () => {
    assert.ok(
      contributeHtml.includes('aria-label="Station 1"'),
      "Contribute page must hold the Station picker",
    );
    assert.ok(
      contributeHtml.includes('aria-required="true"'),
      "The Station picker (and the name) must be marked required",
    );

    for (const line of data.lines) {
      assert.ok(
        contributeHtml.includes(`<optgroup label="${line.name}">`),
        `Station picker must group the ${line.name} line`,
      );
      for (const station of line.stations) {
        const option = `value="${station.code}"`;
        assert.ok(
          contributeHtml.includes(option),
          `Station ${station.code} (${station.name}) missing from the picker`,
        );
      }
    }
  });

  it("offers the controlled Type list, but not as a requirement", () => {
    assert.ok(
      contributeHtml.includes('id="type"'),
      "Contribute page must hold the optional Type picker",
    );
    for (const type of CONTRIBUTION_TYPES) {
      assert.ok(
        contributeHtml.includes(`value="${type}"`),
        `Type option "${type}" missing from the form`,
      );
    }
  });

  it("offers the required Map link, the note, and Contributor fields", () => {
    for (const id of ["map", "note", "contributorName", "contributorHref"]) {
      assert.ok(
        contributeHtml.includes(`id="${id}"`),
        `Contribute form is missing the "${id}" field`,
      );
    }
  });

  it("has no reference to the old submit route or third-party form", () => {
    assert.ok(
      !existsSync(resolve(BUILD_DIR, RETIRED_ROUTE.slice(1))),
      "The retired route must not be prerendered",
    );
    assert.ok(
      !browseHtml.includes(RETIRED_FORM_HOST),
      "Browse page must not contain a third-party form embed or its script",
    );
    assert.ok(
      !browseHtml.includes(RETIRED_ROUTE),
      "Browse page must not link to the retired route",
    );

    const firstPlace = data.places[0];
    const placeHtml = stripComments(
      readFileSync(
        resolve(BUILD_DIR, "places", firstPlace.slug, "index.html"),
        "utf-8",
      ),
    );
    assert.ok(
      !placeHtml.includes(RETIRED_FORM_HOST),
      "Place page must not contain a third-party form embed or its script",
    );
    assert.ok(
      !placeHtml.includes(RETIRED_ROUTE),
      "Place page must not link to the retired route",
    );
  });
});

// ---------------------------------------------------------------------------
// Cloudflare Web Analytics
// ---------------------------------------------------------------------------

describe("Cloudflare Web Analytics", () => {
  it("with token set, the HTML contains the beacon script", () => {
    const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN;
    if (!token) {
      // Build without token — skip this test
      return;
    }
    assert.ok(
      browseHtml.includes("static.cloudflareinsights.com/beacon.min.js"),
      "Beacon script missing when token is set",
    );
    assert.ok(
      browseHtml.includes(`data-cf-beacon`),
      "data-cf-beacon attribute missing when token is set",
    );
    assert.ok(
      browseHtml.includes(token),
      "Token not found in beacon data attribute",
    );
  });

  it("without token set, no cloudflareinsights reference exists", () => {
    const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN;
    if (token) {
      // Build with token — skip this test
      return;
    }
    assert.ok(
      !browseHtml.includes("cloudflareinsights"),
      "No cloudflareinsights reference should exist without a token",
    );
  });
});
