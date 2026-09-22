import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Place, Station } from "../app/lib/browse-filter.ts";
import type { Line } from "../app/lib/lines.ts";
import { coveredLine } from "../app/lib/lines.ts";
import { lines, stations, places } from "../app/data/directory.node.ts";

const BUILD_DIR = resolve(import.meta.dirname, "../build/client");

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
let submitHtml: string;
let data: { lines: Line[]; stations: Station[]; places: Place[] };

before(() => {
  browseHtml = stripComments(
    readFileSync(resolve(BUILD_DIR, "index.html"), "utf-8"),
  );
  submitHtml = stripComments(
    readFileSync(resolve(BUILD_DIR, "submit", "index.html"), "utf-8"),
  );
  data = { lines, stations, places };
});

// ---------------------------------------------------------------------------
// Intro copy on Browse page
// ---------------------------------------------------------------------------

describe("browse page intro copy", () => {
  let line: Line;
  let ordered: Line["stations"];
  let checked: Line["stations"];
  let unchecked: Line["stations"];
  let nameOf: (code: string) => string;
  let intro: string;

  before(() => {
    line = coveredLine(data.lines, data.stations);
    ordered = [...line.stations].sort((a, b) => a.sort - b.sort);
    const checkedCodes = new Set(data.stations.map((s) => s.code));
    checked = ordered.filter((s) => checkedCodes.has(s.code));
    unchecked = ordered.filter((s) => !checkedCodes.has(s.code));
    const stationByCode = new Map(data.stations.map((s) => [s.code, s]));
    nameOf = (code: string) => stationByCode.get(code)!.name;
    intro = paragraphContaining(browseHtml, "stations so far");
  });

  it("names the Line it covers", () => {
    assert.ok(
      browseHtml.includes(`${line.name} line`),
      `Copy must name the ${line.name} line`,
    );
  });

  it("names the checked count and the Line's total, from the data", () => {
    assert.ok(
      intro.includes(`${checked.length} of the ${ordered.length} stations`),
      `Intro must state "${checked.length} of the ${ordered.length} stations", got: ${intro}`,
    );
    assert.ok(
      !intro.includes(`${checked.length} of the ${unchecked.length} stations`),
      "Intro must not confuse the checked count with the unchecked count",
    );
  });

  it("names the true northern end of the checked stretch", () => {
    const northernEnd = nameOf(checked[0].code);
    const southernEnd = nameOf(checked[checked.length - 1].code);
    assert.ok(
      intro.includes(northernEnd),
      `Intro must name "${northernEnd}" as the checked stretch's northern end, got: ${intro}`,
    );
    assert.ok(
      intro.includes(southernEnd),
      `Intro must name "${southernEnd}" as the checked stretch's southern end, got: ${intro}`,
    );
    assert.ok(
      !intro.includes("KL Gateway"),
      `Intro must not name KL Gateway, which is three checked Stations short of the truth, got: ${intro}`,
    );
  });

  it("names where the unchecked stretch begins, from the data", () => {
    assert.ok(
      intro.includes(unchecked[0].name),
      `Intro must name "${unchecked[0].name}", where the unchecked stretch begins, got: ${intro}`,
    );
    assert.ok(
      intro.includes(unchecked[unchecked.length - 1].name),
      `Intro must name where the unchecked stretch ends, got: ${intro}`,
    );
    assert.ok(
      intro.includes(String(unchecked.length)),
      `Intro must state how many Stations are still to do, got: ${intro}`,
    );
  });

  it("every Station in the data belongs to the Line the page covers", () => {
    for (const station of data.stations) {
      assert.equal(
        station.line,
        line.slug,
        `Station "${station.name}" has line "${station.line}", expected "${line.slug}"`,
      );
    }
  });

  it("does not claim walkability figures the data does not hold", () => {
    assert.ok(
      !intro.toLowerCase().includes("walk"),
      "Intro copy must not mention walkability figures",
    );
  });
});

// ---------------------------------------------------------------------------
// The Line, named from the data
// ---------------------------------------------------------------------------

describe("the Line is read from the data", () => {
  const line = coveredLine(data.lines, data.stations);

  it("every prerendered page names the Line it covers", () => {
    assert.ok(
      browseHtml.includes(`${line.name} line`),
      `Browse page must name the ${line.name} line`,
    );
    assert.ok(
      submitHtml.includes(`${line.name} line`),
      `Submit page must name the ${line.name} line`,
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
  it("browse page footer links to /submit", () => {
    assert.ok(
      browseHtml.includes('href="/submit/"'),
      "Browse page footer must link to /submit",
    );
  });

  it("browse page offers a way to suggest a place", () => {
    assert.ok(
      /suggest a place/i.test(browseHtml),
      "Browse page must offer a way to suggest a place",
    );
  });

  it("submit page links back to the directory", () => {
    assert.ok(
      submitHtml.includes('href="/"'),
      "Submit page must offer a way back to the directory",
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
      placeHtml.includes('href="/submit/"'),
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
      submitHtml.includes('rel="canonical" href="https://naiktrainjer.com/submit/"'),
      "Submit page canonical must point to /submit",
    );
  });

  it("contains the Tally iframe embed", () => {
    assert.ok(
      submitHtml.includes('data-tally-src="https://tally.so/embed/0Q4oRN'),
      "Submit page must embed the Tally form through its self-sizing embed URL",
    );
    assert.ok(
      submitHtml.includes("dynamicHeight=1"),
      "The embed must let Tally size the frame, or the Submit button falls below an inner scrollbar",
    );
    assert.ok(
      submitHtml.includes("hideTitle=1"),
      "The form's own heading duplicates the page heading, so it must be hidden",
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
      /<iframe[^>]*data-tally-src="https:\/\/tally\.so\/embed\/0Q4oRN[^"]*"[^>]*>/,
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

  it("the Tally embed appears only on the Submit page", () => {
    assert.ok(
      !browseHtml.includes("tally.so"),
      "Browse page must not contain the Tally embed or its script",
    );

    const firstPlace = data.places[0];
    const placeHtml = stripComments(
      readFileSync(
        resolve(BUILD_DIR, "places", firstPlace.slug, "index.html"),
        "utf-8",
      ),
    );
    assert.ok(
      !placeHtml.includes("tally.so"),
      "Place page must not contain the Tally embed or its script",
    );
  });

  it("uses Tally's embed script, because a fixed iframe height cuts the form off", () => {
    assert.ok(
      submitHtml.includes("https://tally.so/widgets/embed.js"),
      "The Submit page must load Tally's embed script so the frame matches the form's height",
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
