import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Place, Station } from "../app/lib/browse-filter.ts";

const BUILD_DIR = resolve(import.meta.dirname, "../build/client");
const DATA_PATH = resolve(import.meta.dirname, "../data/properties.json");

function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/g, "");
}

let browseHtml: string;
let submitHtml: string;
let data: { stations: Station[]; places: Place[] };

before(() => {
  browseHtml = stripComments(
    readFileSync(resolve(BUILD_DIR, "index.html"), "utf-8"),
  );
  submitHtml = stripComments(
    readFileSync(resolve(BUILD_DIR, "submit", "index.html"), "utf-8"),
  );
  data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
});

// ---------------------------------------------------------------------------
// Intro copy on Browse page
// ---------------------------------------------------------------------------

describe("browse page intro copy", () => {
  it("names the Kelana Jaya line", () => {
    assert.ok(
      browseHtml.includes("Kelana Jaya line"),
      "Intro copy must name the Kelana Jaya line",
    );
  });

  it("names Putra Heights as the southern end of Coverage", () => {
    assert.ok(
      browseHtml.includes("Putra Heights"),
      "Intro copy must name Putra Heights",
    );
  });

  it("names KL Gateway as the northern end of Coverage", () => {
    assert.ok(
      browseHtml.includes("KL Gateway"),
      "Intro copy must name KL Gateway",
    );
  });

  it("every Station in the data belongs to the Kelana Jaya line", () => {
    for (const station of data.stations) {
      assert.equal(
        station.line,
        "kelana-jaya",
        `Station "${station.name}" has line "${station.line}", expected "kelana-jaya"`,
      );
    }
  });

  it("does not claim walkability figures the data does not hold", () => {
    const introSection = browseHtml.match(/<p[^>]*>.*?Kelana Jaya line.*?<\/p>/s);
    if (introSection) {
      assert.ok(
        !introSection[0].toLowerCase().includes("walk"),
        "Intro copy must not mention walkability figures",
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Footer on Browse and Place pages
// ---------------------------------------------------------------------------

describe("footer link", () => {
  it("browse page footer links to /submit", () => {
    assert.ok(
      browseHtml.includes('href="/submit"'),
      "Browse page footer must link to /submit",
    );
  });

  it("browse page footer contains 'suggest a place'", () => {
    assert.ok(
      browseHtml.includes("suggest a place"),
      "Browse page footer must contain 'suggest a place'",
    );
  });

  it("submit page footer links to /submit", () => {
    assert.ok(
      submitHtml.includes('href="/submit"'),
      "Submit page footer must link to /submit",
    );
  });

  it("place pages have a footer link to /submit", () => {
    const firstPlace = data.places[0];
    const placeHtml = stripComments(
      readFileSync(
        resolve(BUILD_DIR, "places", firstPlace.slug, "index.html"),
        "utf-8",
      ),
    );
    assert.ok(
      placeHtml.includes('href="/submit"'),
      `Place page "${firstPlace.slug}" footer must link to /submit`,
    );
  });
});

// ---------------------------------------------------------------------------
// Submit page
// ---------------------------------------------------------------------------

describe("submit page", () => {
  it("index.html exists at build/client/submit/index.html", () => {
    assert.ok(
      existsSync(resolve(BUILD_DIR, "submit", "index.html")),
      "Submit page not found in build output",
    );
  });

  it("has a title", () => {
    const titles = [...submitHtml.matchAll(/<title>([^<]*)<\/title>/g)];
    assert.ok(titles.length >= 1, "Submit page must have a <title>");
    assert.ok(
      titles[0][1].includes("Suggest"),
      `Title "${titles[0][1]}" should mention "Suggest"`,
    );
  });

  it("has a meta description", () => {
    assert.ok(
      submitHtml.includes('name="description"'),
      "Submit page must have a meta description",
    );
  });

  it("has a canonical link to /submit", () => {
    assert.ok(
      submitHtml.includes('rel="canonical" href="https://naiktrainjer.com/submit"'),
      "Submit page canonical must point to /submit",
    );
  });

  it("contains the Tally iframe embed", () => {
    assert.ok(
      submitHtml.includes('src="https://tally.so/r/0Q4oRN"'),
      "Submit page must embed the Tally form at https://tally.so/r/0Q4oRN",
    );
  });

  it("the Tally iframe has loading='lazy'", () => {
    assert.ok(
      submitHtml.includes("loading=\"lazy\""),
      "Tally iframe must have loading='lazy'",
    );
  });

  it("the Tally iframe has a title attribute", () => {
    const iframeMatch = submitHtml.match(
      /<iframe[^>]*src="https:\/\/tally\.so\/r\/0Q4oRN"[^>]*>/,
    );
    assert.ok(iframeMatch, "Tally iframe not found");
    assert.ok(
      iframeMatch![0].includes("title="),
      "Tally iframe must have a title attribute",
    );
  });

  it("contains a fallback link to the Tally form", () => {
    assert.ok(
      submitHtml.includes('href="https://tally.so/r/0Q4oRN"'),
      "Submit page must have a fallback link to the Tally form",
    );
    assert.ok(
      submitHtml.includes('target="_blank"'),
      "Fallback link must open in a new tab",
    );
  });

  it("the Tally iframe appears only on the Submit page", () => {
    const browseHasTally = browseHtml.includes("tally.so/r/0Q4oRN");
    assert.ok(!browseHasTally, "Browse page must not contain Tally embed");

    const firstPlace = data.places[0];
    const placeHtml = stripComments(
      readFileSync(
        resolve(BUILD_DIR, "places", firstPlace.slug, "index.html"),
        "utf-8",
      ),
    );
    const placeHasTally = placeHtml.includes("tally.so/r/0Q4oRN");
    assert.ok(!placeHasTally, "Place page must not contain Tally embed");
  });

  it("does not contain the Tally script tag (only iframe)", () => {
    assert.ok(
      !submitHtml.includes("tally.so/widgets"),
      "Submit page must not load the Tally script — only the iframe embed",
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
