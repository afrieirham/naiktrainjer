import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Place, Station } from "../app/lib/browse-filter.ts";
import { TYPE_LABELS, KIND_LABELS } from "../app/lib/labels.ts";

const BUILD_DIR = resolve(import.meta.dirname, "../build/client");
const DATA_PATH = resolve(import.meta.dirname, "../data/properties.json");

function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/g, "");
}

function extractMeta(html: string, name: string): string | null {
  const pattern = new RegExp(
    `<meta[^>]*name="${name}"[^>]*content="([^"]*)"`,
    "g",
  );
  const all = [...html.matchAll(pattern)];
  // Exactly one, or the page is wrong: a duplicated tag means the browser and
  // Google read the first, not the one this page wrote.
  return all.length === 1 ? all[0][1] : null;
}

function extractTitle(html: string): string | null {
  const all = [...html.matchAll(/<title>([^<]*)<\/title>/g)];
  return all.length === 1 ? all[0][1] : null;
}

function extractCanonical(html: string): string | null {
  const match = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/);
  return match?.[1] ?? null;
}

let data: { stations: Station[]; places: Place[] };

before(() => {
  data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
});

describe("place page slugs", () => {
  it("all slugs in the data file are unique", () => {
    const slugs = data.places.map((p) => p.slug);
    const unique = new Set(slugs);
    assert.equal(
      unique.size,
      slugs.length,
      `Expected ${slugs.length} unique slugs, got ${unique.size}`,
    );
  });

  it("all slugs are URL-safe (lowercase alphanumeric with hyphens)", () => {
    for (const place of data.places) {
      assert.ok(
        /^[a-z0-9-]+$/.test(place.slug),
        `Slug "${place.slug}" for "${place.name}" is not URL-safe`,
      );
    }
  });

  it("all 84 slugs produced a page file", () => {
    for (const place of data.places) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      assert.ok(
        existsSync(pagePath),
        `Page file missing for slug "${place.slug}" at ${pagePath}`,
      );
    }
  });

  it("no extra pages exist beyond the 84 data slugs", () => {
    const placesDir = resolve(BUILD_DIR, "places");
    if (existsSync(placesDir)) {
      const emitted = readdirSync(placesDir).filter((name) =>
        existsSync(resolve(placesDir, name, "index.html")),
      );
      assert.equal(
        emitted.length,
        data.places.length,
        `Expected ${data.places.length} page dirs, got ${emitted.length}: ${emitted.join(", ")}`,
      );
      for (const dir of emitted) {
        assert.ok(
          data.places.some((p) => p.slug === dir),
          `Emitted page "${dir}" has no matching place in the data file`,
        );
      }
    }
  });
});

describe("place page metadata", () => {
  const pages: Array<{
    slug: string;
    title: string;
    description: string;
    canonical: string;
    html: string;
  }> = [];

  before(() => {
    for (const place of data.places) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = readFileSync(pagePath, "utf-8");
      const clean = stripComments(html);
      const title = extractTitle(clean);
      const description = extractMeta(clean, "description");
      const canonical = extractCanonical(clean);
      assert.ok(title, `Title missing for "${place.slug}"`);
      assert.ok(description, `Description missing for "${place.slug}"`);
      assert.ok(canonical, `Canonical missing for "${place.slug}"`);
      pages.push({
        slug: place.slug,
        title: title!,
        description: description!,
        canonical: canonical!,
        html: clean,
      });
    }
  });

  it("every page has a unique title", () => {
    const titles = pages.map((p) => p.title);
    const unique = new Set(titles);
    assert.equal(
      unique.size,
      titles.length,
      `Found duplicate titles: ${[...unique].filter((t) => titles.filter((x) => x === t).length > 1).join(", ")}`,
    );
  });

  it("every page has a unique description", () => {
    const descriptions = pages.map((p) => p.description);
    const unique = new Set(descriptions);
    assert.equal(
      unique.size,
      descriptions.length,
      `Found duplicate descriptions`,
    );
  });

  it("no page uses the site-wide default title", () => {
    for (const page of pages) {
      assert.notEqual(
        page.title,
        "NaikTrainJer",
        `Page "${page.slug}" uses the default title`,
      );
    }
  });

  it("no page uses the site-wide default description", () => {
    for (const page of pages) {
      assert.ok(
        !page.description.includes(
          "Browse places near LRT stations on the Kelana Jaya line",
        ),
        `Page "${page.slug}" uses the default description`,
      );
    }
  });

  it("every title contains the place name", () => {
    for (const place of data.places) {
      const page = pages.find((p) => p.slug === place.slug)!;
      assert.ok(
        page.title.includes(place.name),
        `Title "${page.title}" does not contain place name "${place.name}"`,
      );
    }
  });

  it("every description mentions the nearest station", () => {
    const stationNameMap = new Map(
      data.stations.map((s) => [s.slug, s.name]),
    );
    for (const place of data.places) {
      const page = pages.find((p) => p.slug === place.slug)!;
      const stationName = stationNameMap.get(place.station)!;
      assert.ok(
        page.description.includes(stationName),
        `Description for "${place.slug}" does not mention station "${stationName}": ${page.description}`,
      );
    }
  });

  it("every canonical URL starts with https://naiktrainjer.com/places/", () => {
    for (const page of pages) {
      assert.ok(
        page.canonical.startsWith("https://naiktrainjer.com/places/"),
        `Canonical "${page.canonical}" for "${page.slug}" does not start with expected prefix`,
      );
    }
  });

  it("every canonical URL ends with the place slug", () => {
    for (const page of pages) {
      assert.ok(
        page.canonical.endsWith(`/${page.slug}`),
        `Canonical "${page.canonical}" for "${page.slug}" does not end with slug`,
      );
    }
  });
});

describe("place page content", () => {
  it("every Building page reads as a property", () => {
    const buildingPlaces = data.places.filter((p) => p.kind === "building");
    for (const place of buildingPlaces) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      const typeLabel = TYPE_LABELS[place.type] ?? place.type;
      assert.ok(
        html.includes(typeLabel.toLowerCase()) || html.includes(place.name),
        `Building page "${place.slug}" should mention property type`,
      );
    }
  });

  it("every Area page reads as a neighbourhood", () => {
    const areaPlaces = data.places.filter((p) => p.kind === "area");
    for (const place of areaPlaces) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      assert.ok(
        html.includes("neighbourhood"),
        `Area page "${place.slug}" should mention "neighbourhood"`,
      );
      assert.ok(
        !html.includes("is a area"),
        `Area page "${place.slug}" should not say "is a area"`,
      );
    }
  });

  it("every page shows its Nearest station", () => {
    const stationNameMap = new Map(
      data.stations.map((s) => [s.slug, s.name]),
    );
    for (const place of data.places) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      const stationName = stationNameMap.get(place.station)!;
      assert.ok(
        html.includes(stationName),
        `Page "${place.slug}" does not show station "${stationName}"`,
      );
    }
  });

  it("every page with alsoNear shows the second station", () => {
    const stationNameMap = new Map(
      data.stations.map((s) => [s.slug, s.name]),
    );
    const placesWithAlsoNear = data.places.filter(
      (p) => p.alsoNear && p.alsoNear.length > 0,
    );
    for (const place of placesWithAlsoNear) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      for (const alsoNearSlug of place.alsoNear!) {
        const stationName = stationNameMap.get(alsoNearSlug)!;
        assert.ok(
          html.includes(stationName),
          `Page "${place.slug}" does not show alsoNear station "${stationName}"`,
        );
      }
    }
  });

  it("no unmeasured Place shows walk-time figures", () => {
    for (const place of data.places) {
      if (place.walkMinutes !== undefined) continue;
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      assert.ok(
        !html.includes("min walk") && !html.includes("min drive"),
        `Unmeasured page "${place.slug}" should not show walk/drive time`,
      );
    }
  });

  it("every page has a Walk/Drive toggle", () => {
    for (const place of data.places) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      assert.ok(
        html.includes('aria-label="Travel mode"'),
        `Page "${place.slug}" is missing the Walk/Drive toggle`,
      );
    }
  });

  it("every page has a link back to Browse", () => {
    for (const place of data.places) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      assert.ok(
        html.includes('href="/"') || html.includes("Browse all places"),
        `Page "${place.slug}" is missing a link back to Browse`,
      );
    }
  });

  it("every page has an Open route link", () => {
    for (const place of data.places) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      assert.ok(
        html.includes("Open route"),
        `Page "${place.slug}" is missing the Open route link`,
      );
    }
  });

  it("every page has a Place on Google Maps link", () => {
    for (const place of data.places) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      assert.ok(
        html.includes("Place on Google Maps"),
        `Page "${place.slug}" is missing the Google Maps link`,
      );
    }
  });
});

describe("browse page place links", () => {
  let browseHtml: string;

  before(() => {
    const browsePath = resolve(BUILD_DIR, "index.html");
    browseHtml = stripComments(readFileSync(browsePath, "utf-8"));
  });

  it("every Place name in the browse page links to its place page", () => {
    for (const place of data.places) {
      const href = `/places/${place.slug}`;
      assert.ok(
        browseHtml.includes(`href="${href}"`),
        `Browse page does not link to "${href}" for "${place.name}"`,
      );
    }
  });
});

describe("measured Place rendering (unit test)", () => {
  it("a Place with walkMinutes would show walk figure in rendering logic", () => {
    const measuredPlace: Place = {
      slug: "test-measured",
      name: "Test Measured Place",
      kind: "building",
      type: "condominium",
      station: "lrt-bangsar",
      walkMinutes: 8,
      walkMeters: 600,
      driveMinutes: 3,
    };

    assert.ok(
      measuredPlace.walkMinutes !== undefined,
      "walkMinutes should be defined",
    );
    assert.ok(
      measuredPlace.driveMinutes !== undefined,
      "driveMinutes should be defined",
    );
    assert.equal(measuredPlace.walkMinutes, 8);
    assert.equal(measuredPlace.walkMeters, 600);
    assert.equal(measuredPlace.driveMinutes, 3);
  });

  it("an unmeasured Place has no walk/drive fields", () => {
    const unmeasuredPlace: Place = {
      slug: "test-unmeasured",
      name: "Test Unmeasured Place",
      kind: "area",
      type: "area",
      station: "lrt-bangsar",
    };

    assert.equal(unmeasuredPlace.walkMinutes, undefined);
    assert.equal(unmeasuredPlace.walkMeters, undefined);
    assert.equal(unmeasuredPlace.driveMinutes, undefined);
  });
});
