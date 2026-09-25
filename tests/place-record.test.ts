import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ValidatedContribution } from "../app/lib/contribution.ts";
import {
  buildPlace,
  buildPlaceFile,
  contributionToDraft,
  contributionToPlace,
  deriveSlug,
  placeRecord,
  validatePlace,
  type PlaceDraft,
} from "../app/lib/place.ts";

const STATIONS = ["KJ1", "KJ20", "AG1"];

function draft(overrides: Partial<PlaceDraft> = {}): PlaceDraft {
  return {
    name: "Amcorp Service Suite",
    kind: "building",
    type: "service-apartment",
    map: "https://maps.app.goo.gl/x",
    connections: [{ station: "KJ20", embed: "" }],
    source: "owner",
    contributorName: "",
    contributorHref: "",
    ...overrides,
  };
}

const CONTRIBUTION: ValidatedContribution = {
  name: "Amcorp Service Suite",
  connections: [{ station: "KJ20", embed: null }],
  type: "service-apartment",
  map: "https://maps.app.goo.gl/x",
  note: "Ten minutes from the station.",
  contributor: { name: "Emily Yeo", href: "https://example.com/me" },
};

describe("deriveSlug", () => {
  it("lowercases and hyphenates a name", () => {
    assert.equal(deriveSlug("Amcorp Service Suite"), "amcorp-service-suite");
    assert.equal(
      deriveSlug("  Gaya Bangsar & D'Sara  "),
      "gaya-bangsar-d-sara",
    );
  });

  it("collapses every run of punctuation so the slug is URL-safe", () => {
    assert.equal(deriveSlug("KL Eco City — Vogue Suites #1"), "kl-eco-city-vogue-suites-1");
    assert.match(deriveSlug("Menara Pelangi!!!"), /^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
  });

  it("is empty when the name holds nothing a URL can be made from", () => {
    assert.equal(deriveSlug("  !!! "), "");
    assert.equal(deriveSlug(""), "");
  });
});

describe("validatePlace", () => {
  it("accepts a complete Place with a Map link and a Connection", () => {
    const { errors, place } = validatePlace(
      draft({
        connections: [{ station: "KJ20", embed: "" }],
        map: "https://maps.app.goo.gl/x",
      }),
      STATIONS,
    );

    assert.deepEqual(errors, {});
    assert.deepEqual(place, {
      name: "Amcorp Service Suite",
      kind: "building",
      type: "service-apartment",
      map: "https://maps.app.goo.gl/x",
      connections: [{ station: "KJ20", embed: null }],
      source: "owner",
      contributor: null,
    });
  });

  it("accepts a Connection without a Route frame", () => {
    const { errors, place } = validatePlace(
      draft({ connections: [{ station: "KJ20", embed: "" }] }),
      STATIONS,
    );

    assert.deepEqual(errors, {});
    assert.deepEqual(place?.connections, [{ station: "KJ20", embed: null }]);
  });

  it("requires a name, kind, type and a Map link", () => {
    const { errors } = validatePlace(
      draft({ name: "", kind: "", type: "", map: "" }),
      STATIONS,
    );
    assert.match(errors.name, /name/);
    assert.match(errors.kind, /kind/);
    assert.match(errors.type, /type/);
    assert.match(errors.map, /Map link/);
  });

  it("rejects a Kind, Type or Station outside the controlled lists", () => {
    const { errors } = validatePlace(
      draft({
        kind: "castle",
        type: "castle",
        connections: [{ station: "XX9", embed: "" }],
      }),
      STATIONS,
    );
    assert.match(errors.kind, /not a kind/);
    assert.match(errors.type, /not a type/);
    assert.match(errors.connections, /not a station/);
  });

  it("requires at least one Connection", () => {
    const { errors } = validatePlace(
      draft({ connections: [{ station: "", embed: "" }] }),
      STATIONS,
    );
    assert.match(errors.connections, /at least one station/);
  });

  it("rejects a map link or Route frame that is not a web address", () => {
    assert.match(
      validatePlace(draft({ map: "javascript:alert(1)" }), STATIONS).errors.map,
      /web address/,
    );
    assert.match(
      validatePlace(
        draft({ connections: [{ station: "KJ20", embed: "not a url" }] }),
        STATIONS,
      ).errors.connections,
      /web address/,
    );
  });

  it("rejects a Route frame that is not a Google Maps embed", () => {
    assert.match(
      validatePlace(
        draft({
          connections: [
            { station: "KJ20", embed: "https://maps.app.goo.gl/x" },
          ],
        }),
        STATIONS,
      ).errors.connections,
      /Google Maps embed/,
    );
    assert.equal(
      validatePlace(
        draft({
          connections: [
            {
              station: "KJ20",
              embed: "https://www.google.com/maps/embed?pb=!3e2!walk",
            },
          ],
        }),
        STATIONS,
      ).errors.connections,
      undefined,
    );
  });

  it("normalises a whole <iframe> Route frame to the bare walking URL", () => {
    const { errors, place } = validatePlace(
      draft({
        connections: [
          {
            station: "KJ20",
            embed:
              '<iframe src="https://www.google.com/maps/embed?pb=!3e0!drive" loading="lazy"></iframe>',
          },
        ],
      }),
      STATIONS,
    );

    assert.deepEqual(errors, {});
    assert.deepEqual(place?.connections, [
      {
        station: "KJ20",
        embed: "https://www.google.com/maps/embed?pb=!3e2!drive",
      },
    ]);
  });

  it("rejects a share link or a directions link with a clear message", () => {
    for (const embed of [
      "https://maps.app.goo.gl/rk7aw2Jn3MBU82iS9",
      "https://www.google.com/maps/dir/?api=1&origin=a&destination=b",
    ]) {
      assert.match(
        validatePlace(
          draft({ connections: [{ station: "KJ20", embed }] }),
          STATIONS,
        ).errors.connections,
        /Google Maps embed/,
      );
    }
  });

  it("rejects a bad contributor link but allows a blank one", () => {
    assert.match(
      validatePlace(draft({ contributorHref: "nope" }), STATIONS).errors
        .contributorHref,
      /web address/,
    );
    assert.equal(
      validatePlace(draft({ contributorHref: "" }), STATIONS).errors
        .contributorHref,
      undefined,
    );
  });
});

describe("buildPlace", () => {
  it("derives the slug and writes data/places/<slug>.json", () => {
    const built = buildPlace(draft(), STATIONS, []);

    assert.deepEqual(built.errors, {});
    assert.equal(built.slug, "amcorp-service-suite");
    assert.equal(built.file?.path, "data/places/amcorp-service-suite.json");
    assert.ok(built.file?.contents.endsWith("\n"));

    const record = JSON.parse(built.file!.contents) as Record<string, unknown>;
    assert.equal(record.slug, "amcorp-service-suite");
    assert.equal(record.name, "Amcorp Service Suite");
    assert.equal(record.source, "owner");
    assert.deepEqual(record.connections, [{ station: "KJ20" }]);
    assert.equal("contributor" in record, false, "an owner Place credits nobody");
  });

  it("refuses to overwrite an existing Place", () => {
    const built = buildPlace(draft(), STATIONS, ["amcorp-service-suite"]);

    assert.equal(built.file, null);
    assert.equal(built.place, null);
    assert.match(built.errors.slug, /already lives/);
  });

  it("reports a name that cannot make a slug", () => {
    const built = buildPlace(draft({ name: "!!!" }), STATIONS, []);
    assert.match(built.errors.slug, /web address/);
    assert.equal(built.file, null);
  });
});

describe("placeRecord", () => {
  it("writes the required Map link and the Connections", () => {
    const built = buildPlace(draft(), STATIONS, []);
    const record = placeRecord(built.place!, built.slug!);

    assert.equal(record.map, "https://maps.app.goo.gl/x");
    assert.deepEqual(record.connections, [{ station: "KJ20" }]);
    assert.equal("station" in record, false, "the old single Station is gone");
    assert.equal("alsoNear" in record, false, "the Also near list is gone");
    assert.equal("coordinates" in record, false, "coordinates are retired");
  });

  it("keeps a Connection's Route frame when there is one", () => {
    const built = buildPlace(
      draft({
        connections: [
          { station: "KJ20", embed: "https://www.google.com/maps/embed?pb=walk" },
        ],
      }),
      STATIONS,
      [],
    );
    const record = placeRecord(built.place!, built.slug!);

    assert.deepEqual(record.connections, [
      {
        station: "KJ20",
        embed: "https://www.google.com/maps/embed?pb=walk",
      },
    ]);
  });

  it("persists a Contributor when there is one", () => {
    const built = buildPlace(
      draft({
        source: "contributed",
        contributorName: "Emily Yeo",
        contributorHref: "https://example.com/me",
      }),
      STATIONS,
      [],
    );

    assert.deepEqual(built.place?.contributor, {
      name: "Emily Yeo",
      href: "https://example.com/me",
    });
    assert.deepEqual(
      JSON.parse(buildPlaceFile(built.place!, built.slug!).contents).contributor,
      { name: "Emily Yeo", href: "https://example.com/me" },
    );
  });
});

describe("contributionToDraft", () => {
  it("prefills every field a Contribution can supply, Connections included", () => {
    const prefilled = contributionToDraft(CONTRIBUTION);

    assert.equal(prefilled.name, "Amcorp Service Suite");
    assert.deepEqual(prefilled.connections, [{ station: "KJ20", embed: "" }]);
    assert.equal(prefilled.type, "service-apartment");
    assert.equal(prefilled.map, "https://maps.app.goo.gl/x");
    assert.equal(prefilled.source, "contributed");
    assert.equal(prefilled.contributorName, "Emily Yeo");
    assert.equal(prefilled.contributorHref, "https://example.com/me");
    assert.equal(prefilled.kind, "", "the maintainer still picks the Kind");
  });
});

describe("contributionToPlace (the approval transform)", () => {
  it("maps the Contribution and the confirmed fields into one Place", () => {
    const fields = draft({
      name: "Amcorp Service Suite",
      kind: "building",
      type: "service-apartment",
      map: "https://maps.app.goo.gl/x",
      connections: [{ station: "KJ20", embed: "" }],
      source: "owner",
      contributorName: "Emily Yeo",
      contributorHref: "https://example.com/me",
    });

    const built = contributionToPlace(CONTRIBUTION, fields, STATIONS, []);

    assert.deepEqual(built.errors, {});
    assert.equal(built.slug, "amcorp-service-suite");
    assert.equal(built.place?.source, "contributed", "an approved Contribution is contributed");
    assert.deepEqual(built.place?.connections, [{ station: "KJ20", embed: null }]);
    assert.deepEqual(built.place?.contributor, {
      name: "Emily Yeo",
      href: "https://example.com/me",
    });
    assert.equal(built.file?.path, "data/places/amcorp-service-suite.json");
  });

  it("carries the Contributor and the Connections over when the form left them blank", () => {
    const built = contributionToPlace(
      CONTRIBUTION,
      draft({
        source: "owner",
        connections: [{ station: "", embed: "" }],
        contributorName: "",
        contributorHref: "",
      }),
      STATIONS,
      [],
    );

    assert.deepEqual(built.place?.connections, [{ station: "KJ20", embed: null }]);
    assert.deepEqual(built.place?.contributor, CONTRIBUTION.contributor);
    assert.equal(built.place?.source, "contributed");
  });

  it("refuses a slug that already holds a Place", () => {
    const built = contributionToPlace(
      CONTRIBUTION,
      draft(),
      STATIONS,
      ["amcorp-service-suite"],
    );

    assert.equal(built.file, null);
    assert.match(built.errors.slug, /already lives/);
  });
});
