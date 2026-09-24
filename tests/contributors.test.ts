import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Place } from "../app/lib/browse-filter.ts";
import {
  creditedContributors,
  placeContributor,
} from "../app/lib/contributors.ts";
import { places } from "../app/data/directory.node.ts";

const BUILD_DIR = resolve(import.meta.dirname, "../build/client");
const SITE_URL = "https://naiktrainjer.com";

function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/g, "");
}

function place(overrides: Partial<Place> = {}): Place {
  return {
    slug: "amcorp-service-suite",
    name: "Amcorp Service Suite",
    kind: "building",
    type: "service-apartment",
    map: "https://maps.app.goo.gl/x",
    connections: [{ station: "KJ20", embed: null }],
    source: "contributed",
    ...overrides,
  };
}

describe("placeContributor", () => {
  it("credits the Contributor of a contributed Place", () => {
    const contributor = { name: "Emily Yeo", href: "https://example.com/me" };
    assert.deepEqual(
      placeContributor(place({ contributor })),
      contributor,
    );
  });

  it("credits a contributed Place whose Contributor gave no link", () => {
    assert.deepEqual(
      placeContributor(place({ contributor: { name: "Emily Yeo", href: null } })),
      { name: "Emily Yeo", href: null },
    );
  });

  it("credits nobody when the Place is owner-researched", () => {
    assert.equal(
      placeContributor(
        place({
          source: "owner",
          contributor: { name: "Emily Yeo", href: null },
        }),
      ),
      null,
    );
  });

  it("credits nobody when a contributed Place has no Contributor", () => {
    assert.equal(placeContributor(place({ contributor: undefined })), null);
  });
});

describe("creditedContributors", () => {
  it("is empty when nothing has been contributed", () => {
    assert.deepEqual(creditedContributors([]), []);
    assert.deepEqual(
      creditedContributors([
        place({ source: "owner", contributor: { name: "A", href: null } }),
      ]),
      [],
    );
  });

  it("groups every Place a Contributor contributed under one credit", () => {
    const credits = creditedContributors([
      place({ slug: "b", name: "B", contributor: { name: "Emily", href: null } }),
      place({ slug: "a", name: "A", contributor: { name: "Emily", href: null } }),
    ]);

    assert.equal(credits.length, 1);
    assert.equal(credits[0].name, "Emily");
    assert.equal(credits[0].href, null);
    assert.deepEqual(
      credits[0].places.map((p) => p.slug),
      ["a", "b"],
      "the Places under one credit are sorted by name",
    );
  });

  it("identifies a Contributor by name together with their link", () => {
    const credits = creditedContributors([
      place({ slug: "with", contributor: { name: "Emily", href: "https://e.com" } }),
      place({ slug: "without", contributor: { name: "Emily", href: null } }),
      place({ slug: "other", contributor: { name: "Emily", href: "https://f.com" } }),
    ]);

    assert.equal(credits.length, 3, "same name, different links are different people");
    assert.deepEqual(
      credits.map((credit) => credit.href),
      [null, "https://e.com", "https://f.com"],
      "credits sort by name then link",
    );
  });

  it("merges the same name and link into one credit", () => {
    const credits = creditedContributors([
      place({ slug: "one", contributor: { name: "Emily", href: "https://e.com" } }),
      place({ slug: "two", contributor: { name: "Emily", href: "https://e.com" } }),
    ]);

    assert.equal(credits.length, 1);
    assert.deepEqual(credits[0].places.map((p) => p.slug), ["one", "two"]);
  });

  it("sorts Contributors deterministically by name, then link", () => {
    const credits = creditedContributors([
      place({ slug: "z", contributor: { name: "Zoe", href: null } }),
      place({ slug: "b", contributor: { name: "Ben", href: "https://b.com" } }),
      place({ slug: "a", contributor: { name: "Ben", href: "https://a.com" } }),
    ]);

    assert.deepEqual(
      credits.map((credit) => `${credit.name} ${credit.href ?? ""}`.trim()),
      ["Ben https://a.com", "Ben https://b.com", "Zoe"],
    );
  });
});

describe("the credit on a Place page", () => {
  it("no owner-researched Place shows a credit", () => {
    for (const record of places) {
      if (record.source === "contributed") continue;
      const html = stripComments(
        readFileSync(
          resolve(BUILD_DIR, "places", record.slug, "index.html"),
          "utf-8",
        ),
      );
      assert.ok(
        !html.includes("Contributed by"),
        `Owner Place "${record.slug}" must not carry a credit`,
      );
    }
  });

  it("every contributed Place with a Contributor shows the credit", () => {
    for (const record of places) {
      const contributor = placeContributor(record);
      if (!contributor) continue;
      const html = stripComments(
        readFileSync(
          resolve(BUILD_DIR, "places", record.slug, "index.html"),
          "utf-8",
        ),
      );
      assert.ok(
        html.includes("Contributed by"),
        `Contributed Place "${record.slug}" must carry a credit`,
      );
      assert.ok(
        html.includes(contributor.name),
        `Contributed Place "${record.slug}" must name its Contributor`,
      );
      if (contributor.href) {
        assert.ok(
          html.includes(`href="${contributor.href}"`),
          `Contributed Place "${record.slug}" must link its Contributor`,
        );
      }
    }
  });
});

describe("/contributors page", () => {
  let html: string;

  before(() => {
    html = stripComments(
      readFileSync(resolve(BUILD_DIR, "contributors", "index.html"), "utf-8"),
    );
  });

  it("prerenders at build/client/contributors/index.html", () => {
    assert.ok(
      existsSync(resolve(BUILD_DIR, "contributors", "index.html")),
      "Contributors page missing from build output",
    );
  });

  it("has a title naming the Contributors page", () => {
    const titles = [...html.matchAll(/<title>([^<]*)<\/title>/g)];
    assert.equal(titles.length, 1, "Contributors page must have one <title>");
    assert.ok(
      titles[0][1].includes("Contributors"),
      `Title "${titles[0][1]}" should mention "Contributors"`,
    );
  });

  it("has a meta description", () => {
    assert.ok(
      html.includes('name="description"'),
      "Contributors page must have a meta description",
    );
  });

  it("has a canonical link to /contributors/", () => {
    assert.ok(
      html.includes(`rel="canonical" href="${SITE_URL}/contributors/"`),
      "Contributors page canonical must point to /contributors/",
    );
  });

  it("stands under the shared AppBar", () => {
    assert.ok(
      html.includes('href="/"') && html.includes("NaikTrainJer"),
      "Contributors page must carry the shared chrome",
    );
  });

  it("names the Contributors and the Places they contributed", () => {
    const credits = creditedContributors(places);
    for (const credit of credits) {
      assert.ok(
        html.includes(credit.name),
        `Contributors page must name "${credit.name}"`,
      );
      for (const contributed of credit.places) {
        assert.ok(
          html.includes(contributed.name),
          `Contributors page must list "${contributed.name}"`,
        );
      }
    }
  });
});

describe("the shared chrome links to Contributors", () => {
  it("the Browse page links to /contributors/", () => {
    const browse = stripComments(
      readFileSync(resolve(BUILD_DIR, "index.html"), "utf-8"),
    );
    assert.ok(
      browse.includes('href="/contributors/"'),
      "Browse page chrome must link to /contributors/",
    );
  });
});
