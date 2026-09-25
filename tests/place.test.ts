import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Place } from "../app/lib/browse-filter.ts";
import { TYPE_LABELS, KIND_LABELS } from "../app/lib/labels.ts";
import { stationNamesByCode } from "../app/lib/lines.ts";
import { lines, places } from "../app/data/directory.node.ts";

const BUILD_DIR = resolve(import.meta.dirname, "../build/client");
const OG_DIR = resolve(BUILD_DIR, "og");
const STATION_NAMES = stationNamesByCode(lines);

function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/g, "");
}

/** The text as the prerendered HTML carries it: React escapes entities. */
function asHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&#x27;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractMeta(html: string, name: string): string | null {
  const pattern = new RegExp(
    `<meta[^>]*name="${name}"[^>]*content="([^"]*)"`,
    "g",
  );
  const all = [...html.matchAll(pattern)];
  return all.length === 1 ? all[0][1] : null;
}

function extractPropertyMeta(html: string, property: string): string | null {
  const pattern = new RegExp(
    `<meta[^>]*property="${property}"[^>]*content="([^"]*)"`,
    "g",
  );
  const all = [...html.matchAll(pattern)];
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

let data: { places: Place[] };

before(() => {
  data = { places };
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
    const stationNameMap = STATION_NAMES;
    for (const place of data.places) {
      const page = pages.find((p) => p.slug === place.slug)!;
      const stationCode = place.connections[0]?.station ?? "";
      const stationName = stationNameMap.get(stationCode)!;
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
        page.canonical.endsWith(`/${page.slug}/`),
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
    const stationNameMap = STATION_NAMES;
    for (const place of data.places) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      const stationCode = place.connections[0]?.station ?? "";
      const stationName = stationNameMap.get(stationCode)!;
      assert.ok(
        html.includes(stationName),
        `Page "${place.slug}" does not show station "${stationName}"`,
      );
    }
  });

  it("every page shows every Station it connects to", () => {
    const stationNameMap = STATION_NAMES;
    const placesWithSeveral = data.places.filter(
      (p) => p.connections.length > 1,
    );
    for (const place of placesWithSeveral) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      for (const connection of place.connections.slice(1)) {
        const stationName = stationNameMap.get(connection.station)!;
        assert.ok(
          html.includes(stationName),
          `Page "${place.slug}" does not show its other station "${stationName}"`,
        );
      }
    }
  });

  it("shows every Station as `<code> <name>`", () => {
    const stationNameMap = STATION_NAMES;
    for (const place of data.places) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      for (const connection of place.connections) {
        const label = asHtmlText(
          `${connection.station} ${stationNameMap.get(connection.station)!}`,
        );
        assert.ok(
          html.includes(label),
          `Page "${place.slug}" must show "${label}"`,
        );
      }
    }
  });

  it("no page shows a walk or drive figure", () => {
    for (const place of data.places) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      assert.ok(
        !html.includes("min walk") && !html.includes("min drive"),
        `Page "${place.slug}" should not show a walk or drive figure`,
      );
      assert.ok(
        !html.includes("Walk / drive"),
        `Page "${place.slug}" should not carry a walk figure block`,
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

  it("every page opens the route in Google Maps", () => {
    for (const place of data.places) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      assert.ok(
        html.includes("Open in Google Maps"),
        `Page "${place.slug}" is missing the Google Maps route link`,
      );
    }
  });

  it("every page routes to the station on Google Maps, with no separate pin link", () => {
    for (const place of data.places) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      assert.ok(
        html.includes("google.com/maps/dir") && html.includes("Open in Google Maps"),
        `Page "${place.slug}" must offer the route on Google Maps`,
      );
      assert.ok(
        !html.includes("Place on Google Maps"),
        `Page "${place.slug}" must not carry a separate place pin link`,
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

  it("does not link the corridor out to Place pages", () => {
    for (const place of data.places) {
      assert.ok(
        !browseHtml.includes(`href="/places/${place.slug}/"`),
        `Browse page must not link to "${place.slug}": a Place page is a search landing page that funnels into the app, not a destination from it`,
      );
    }
  });
});

describe("Open Graph and Twitter meta tags", () => {
  const pages: Array<{
    slug: string;
    ogTitle: string | null;
    ogDescription: string | null;
    ogType: string | null;
    ogUrl: string | null;
    ogImage: string | null;
    twitterCard: string | null;
    twitterImage: string | null;
  }> = [];

  before(() => {
    for (const place of data.places) {
      const pagePath = resolve(
        BUILD_DIR,
        "places",
        place.slug,
        "index.html",
      );
      const html = stripComments(readFileSync(pagePath, "utf-8"));
      pages.push({
        slug: place.slug,
        ogTitle: extractPropertyMeta(html, "og:title"),
        ogDescription: extractPropertyMeta(html, "og:description"),
        ogType: extractPropertyMeta(html, "og:type"),
        ogUrl: extractPropertyMeta(html, "og:url"),
        ogImage: extractPropertyMeta(html, "og:image"),
        twitterCard: extractMeta(html, "twitter:card"),
        twitterImage: extractMeta(html, "twitter:image"),
      });
    }
  });

  it("every page has og:title", () => {
    for (const page of pages) {
      assert.ok(page.ogTitle, `og:title missing for "${page.slug}"`);
    }
  });

  it("every page has og:description", () => {
    for (const page of pages) {
      assert.ok(
        page.ogDescription,
        `og:description missing for "${page.slug}"`,
      );
    }
  });

  it("every page has og:type", () => {
    for (const page of pages) {
      assert.ok(page.ogType, `og:type missing for "${page.slug}"`);
    }
  });

  it("every page has og:url", () => {
    for (const page of pages) {
      assert.ok(page.ogUrl, `og:url missing for "${page.slug}"`);
      assert.ok(
        page.ogUrl!.startsWith("https://naiktrainjer.com/places/"),
        `og:url "${page.ogUrl}" for "${page.slug}" does not start with expected prefix`,
      );
    }
  });

  it("every page has og:image pointing at the built card", () => {
    for (const page of pages) {
      assert.ok(page.ogImage, `og:image missing for "${page.slug}"`);
      assert.equal(
        page.ogImage,
        `https://naiktrainjer.com/og/${page.slug}.png`,
        `og:image for "${page.slug}" does not match expected path`,
      );
    }
  });

  it("every page has twitter:card = summary_large_image", () => {
    for (const page of pages) {
      assert.equal(
        page.twitterCard,
        "summary_large_image",
        `twitter:card for "${page.slug}" is not summary_large_image`,
      );
    }
  });

  it("every page has twitter:image matching og:image", () => {
    for (const page of pages) {
      assert.ok(
        page.twitterImage,
        `twitter:image missing for "${page.slug}"`,
      );
      assert.equal(
        page.twitterImage,
        page.ogImage,
        `twitter:image does not match og:image for "${page.slug}"`,
      );
    }
  });
});

describe("OG card files", () => {
  it("a card file exists for every Place in the data", () => {
    for (const place of data.places) {
      const cardPath = resolve(OG_DIR, `${place.slug}.png`);
      assert.ok(
        existsSync(cardPath),
        `Card file missing for "${place.slug}" at ${cardPath}`,
      );
    }
  });

  it("no card files exist for slugs not in the data", () => {
    if (existsSync(OG_DIR)) {
      const emitted = readdirSync(OG_DIR);
      for (const file of emitted) {
        const slug = file.replace(/\.png$/, "");
        assert.ok(
          data.places.some((p) => p.slug === slug),
          `Card file "${file}" has no matching place in the data file`,
        );
      }
    }
  });

  it("every card file is a real PNG with 1200x630 dimensions", async () => {
    const { default: sharp } = await import("sharp");
    for (const place of data.places) {
      const cardPath = resolve(OG_DIR, `${place.slug}.png`);
      const buf = readFileSync(cardPath);
      assert.ok(buf.length > 1000, `Card for "${place.slug}" is near-empty (${buf.length} bytes)`);
      // PNG magic bytes: 0x89 P N G
      assert.equal(buf[0], 0x89, `Card for "${place.slug}" missing PNG magic byte 0x89`);
      assert.equal(buf[1], 0x50, `Card for "${place.slug}" missing PNG magic byte P`);
      assert.equal(buf[2], 0x4e, `Card for "${place.slug}" missing PNG magic byte N`);
      assert.equal(buf[3], 0x47, `Card for "${place.slug}" missing PNG magic byte G`);
      const meta = await sharp(buf).metadata();
      assert.equal(meta.width, 1200, `Card for "${place.slug}" width is ${meta.width}, expected 1200`);
      assert.equal(meta.height, 630, `Card for "${place.slug}" height is ${meta.height}, expected 630`);
    }
  });

  it("no two Places reference the same card file", () => {
    const paths = data.places.map((p) => `og/${p.slug}.png`);
    const unique = new Set(paths);
    assert.equal(
      unique.size,
      paths.length,
      `Found duplicate card references`,
    );
  });
});
