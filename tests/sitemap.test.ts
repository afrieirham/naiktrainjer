import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { resolve } from "node:path";
import type { Place, Station } from "../app/lib/browse-filter.ts";

const BUILD_DIR = resolve(import.meta.dirname, "../build/client");
const DATA_PATH = resolve(import.meta.dirname, "../data/properties.json");
const SITE_URL = "https://naiktrainjer.com";

function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/g, "");
}

function extractTitle(html: string): string | null {
  const all = [...html.matchAll(/<title>([^<]*)<\/title>/g)];
  return all.length === 1 ? all[0][1] : null;
}

function extractMeta(html: string, name: string): string | null {
  const pattern = new RegExp(
    `<meta[^>]*name="${name}"[^>]*content="([^"]*)"`,
    "g",
  );
  const all = [...html.matchAll(pattern)];
  return all.length === 1 ? all[0][1] : null;
}

function extractCanonical(html: string): string | null {
  const match = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/);
  return match?.[1] ?? null;
}

function collectHtmlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      const index = resolve(full, "index.html");
      if (existsSync(index)) results.push(index);
      results.push(...collectHtmlFiles(full));
    }
  }
  return results;
}

let data: { stations: Station[]; places: Place[] };
let sitemapXml: string;
let robotsTxt: string;

before(() => {
  data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  sitemapXml = readFileSync(resolve(BUILD_DIR, "sitemap.xml"), "utf-8");
  robotsTxt = readFileSync(resolve(BUILD_DIR, "robots.txt"), "utf-8");
});

// ---------------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------------

describe("sitemap.xml", () => {
  it("exists in the build output", () => {
    assert.ok(
      existsSync(resolve(BUILD_DIR, "sitemap.xml")),
      "sitemap.xml missing from build/client",
    );
  });

  it("is valid XML with a urlset root", () => {
    assert.ok(sitemapXml.includes("<urlset"), "Missing <urlset>");
    assert.ok(sitemapXml.includes("</urlset>"), "Missing </urlset>");
  });

  it("contains exactly one <loc> for each of the 84 Place slugs", () => {
    const locs = [...sitemapXml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(
      (m) => m[1],
    );
    const placeLocs = locs.filter((url) =>
      url.startsWith(`${SITE_URL}/places/`),
    );
    assert.equal(
      placeLocs.length,
      data.places.length,
      `Expected ${data.places.length} place URLs, got ${placeLocs.length}`,
    );
  });

  it("contains the Browse page URL", () => {
    assert.ok(
      sitemapXml.includes(`<loc>${SITE_URL}/</loc>`),
      "Browse page URL missing from sitemap",
    );
  });

  it("does NOT contain a /submit URL", () => {
    assert.ok(
      !sitemapXml.includes(`${SITE_URL}/submit`),
      "Sitemap should not list /submit before #9 builds it",
    );
  });

  it("all sitemap URLs are absolute and on naiktrainjer.com", () => {
    const locs = [...sitemapXml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(
      (m) => m[1],
    );
    for (const url of locs) {
      assert.ok(
        url.startsWith(`${SITE_URL}/`),
        `URL "${url}" is not absolute on ${SITE_URL}`,
      );
    }
  });

  it("contains exactly one <loc> per Place slug (no duplicates)", () => {
    const locs = [...sitemapXml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(
      (m) => m[1],
    );
    const unique = new Set(locs);
    assert.equal(
      unique.size,
      locs.length,
      `Found ${locs.length} locs but only ${unique.size} unique — duplicates exist`,
    );
  });

  it("every Place slug in the data file appears in the sitemap", () => {
    for (const place of data.places) {
      const expected = `${SITE_URL}/places/${place.slug}`;
      assert.ok(
        sitemapXml.includes(`<loc>${expected}</loc>`),
        `Place "${place.slug}" missing from sitemap`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------

describe("robots.txt", () => {
  it("exists in the build output", () => {
    assert.ok(
      existsSync(resolve(BUILD_DIR, "robots.txt")),
      "robots.txt missing from build/client",
    );
  });

  it("allows crawling", () => {
    assert.ok(
      robotsTxt.includes("User-agent: *"),
      "Missing User-agent directive",
    );
    assert.ok(robotsTxt.includes("Allow: /"), "Missing Allow directive");
  });

  it("points at the sitemap", () => {
    assert.ok(
      robotsTxt.includes(`Sitemap: ${SITE_URL}/sitemap.xml`),
      `robots.txt must reference ${SITE_URL}/sitemap.xml`,
    );
  });
});

// ---------------------------------------------------------------------------
// Sitemap ↔ build parity
// ---------------------------------------------------------------------------

describe("sitemap ↔ build parity", () => {
  let builtPaths: Set<string>;

  before(() => {
    builtPaths = new Set();
    // The root index
    if (existsSync(resolve(BUILD_DIR, "index.html"))) {
      builtPaths.add("/");
    }
    // Place pages
    const placesDir = resolve(BUILD_DIR, "places");
    if (existsSync(placesDir)) {
      for (const slug of readdirSync(placesDir)) {
        if (
          statSync(resolve(placesDir, slug)).isDirectory() &&
          existsSync(resolve(placesDir, slug, "index.html"))
        ) {
          builtPaths.add(`/places/${slug}`);
        }
      }
    }
  });

  it("every sitemap URL corresponds to a real prerendered page", () => {
    const locs = [...sitemapXml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(
      (m) => m[1],
    );
    for (const url of locs) {
      const path = url.replace(SITE_URL, "");
      assert.ok(
        builtPaths.has(path),
        `Sitemap entry "${url}" has no corresponding build output`,
      );
    }
  });

  it("every prerendered page appears in the sitemap", () => {
    for (const path of builtPaths) {
      const fullUrl = `${SITE_URL}${path}`;
      assert.ok(
        sitemapXml.includes(`<loc>${fullUrl}</loc>`),
        `Prerendered page "${path}" missing from sitemap`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Metadata on every page
// ---------------------------------------------------------------------------

describe("page metadata", () => {
  const htmlFiles = collectHtmlFiles(BUILD_DIR);

  it("every prerendered page has exactly one <title>", () => {
    for (const file of htmlFiles) {
      const html = stripComments(readFileSync(file, "utf-8"));
      const titles = [...html.matchAll(/<title>([^<]*)<\/title>/g)];
      const rel = file.replace(BUILD_DIR, "");
      assert.equal(
        titles.length,
        1,
        `${rel}: expected 1 <title>, got ${titles.length}`,
      );
    }
  });

  it("every prerendered page has exactly one meta description", () => {
    for (const file of htmlFiles) {
      const html = stripComments(readFileSync(file, "utf-8"));
      const metas = [
        ...html.matchAll(/<meta[^>]*name="description"[^>]*>/g),
      ];
      const rel = file.replace(BUILD_DIR, "");
      assert.equal(
        metas.length,
        1,
        `${rel}: expected 1 meta description, got ${metas.length}`,
      );
    }
  });

  it("every prerendered page has exactly one canonical link", () => {
    for (const file of htmlFiles) {
      const html = stripComments(readFileSync(file, "utf-8"));
      const links = [
        ...html.matchAll(/<link[^>]*rel="canonical"[^>]*>/g),
      ];
      const rel = file.replace(BUILD_DIR, "");
      assert.equal(
        links.length,
        1,
        `${rel}: expected 1 canonical link, got ${links.length}`,
      );
    }
  });

  it("every canonical URL is absolute and matches the page's own path", () => {
    for (const file of htmlFiles) {
      const html = stripComments(readFileSync(file, "utf-8"));
      const canonical = extractCanonical(html);
      const rel = file.replace(BUILD_DIR, "");
      assert.ok(canonical, `${rel}: canonical missing`);
      assert.ok(
        canonical!.startsWith(`${SITE_URL}/`),
        `${rel}: canonical "${canonical}" is not absolute`,
      );

      // Derive the expected path from the file location
      let expectedPath = file
        .replace(BUILD_DIR, "")
        .replace(/\/index\.html$/, "");
      if (expectedPath === "") expectedPath = "/";
      assert.equal(
        canonical,
        `${SITE_URL}${expectedPath}`,
        `${rel}: canonical "${canonical}" does not match expected "${SITE_URL}${expectedPath}"`,
      );
    }
  });

  it("the root layout no longer hardcodes a title or description", () => {
    const rootPath = resolve(BUILD_DIR, "index.html");
    const raw = readFileSync(rootPath, "utf-8");
    const stripped = stripComments(raw);
    const titles = [...stripped.matchAll(/<title>([^<]*)<\/title>/g)];
    assert.equal(titles.length, 1, `Root has ${titles.length} titles`);
    const metas = [
      ...stripped.matchAll(/<meta[^>]*name="description"[^>]*>/g),
    ];
    assert.equal(
      metas.length,
      1,
      `Root has ${metas.length} meta descriptions`,
    );
  });
});
