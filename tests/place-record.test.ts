import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ValidatedContribution } from "../app/lib/contribution.ts";
import {
  buildPlace,
  buildPlaceFile,
  contributionToDraft,
  contributionToPlace,
  deriveSlug,
  parseStationCodes,
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
    station: "KJ20",
    alsoNear: "",
    map: "",
    lat: "",
    lng: "",
    source: "owner",
    contributorName: "",
    contributorHref: "",
    ...overrides,
  };
}

const CONTRIBUTION: ValidatedContribution = {
  name: "Amcorp Service Suite",
  station: "KJ20",
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

describe("parseStationCodes", () => {
  it("reads a comma- or whitespace-separated list", () => {
    assert.deepEqual(parseStationCodes("KJ1, KJ2  AG3"), ["KJ1", "KJ2", "AG3"]);
    assert.deepEqual(parseStationCodes("  "), []);
  });
});

describe("validatePlace", () => {
  it("accepts a complete Place", () => {
    const { errors, place } = validatePlace(
      draft({
        alsoNear: "KJ1",
        map: "https://maps.app.goo.gl/x",
        lat: "3.1117289",
        lng: "101.6366555",
      }),
      STATIONS,
    );

    assert.deepEqual(errors, {});
    assert.deepEqual(place, {
      name: "Amcorp Service Suite",
      kind: "building",
      type: "service-apartment",
      station: "KJ20",
      alsoNear: ["KJ1"],
      map: "https://maps.app.goo.gl/x",
      coordinates: { lat: 3.1117289, lng: 101.6366555 },
      source: "owner",
      contributor: null,
    });
  });

  it("requires a name, kind, type and Station", () => {
    const { errors } = validatePlace(
      draft({ name: "", kind: "", type: "", station: "" }),
      STATIONS,
    );
    assert.match(errors.name, /name/);
    assert.match(errors.kind, /kind/);
    assert.match(errors.type, /type/);
    assert.match(errors.station, /station/);
  });

  it("rejects a Kind, Type or Station outside the controlled lists", () => {
    const { errors } = validatePlace(
      draft({ kind: "castle", type: "castle", station: "XX9" }),
      STATIONS,
    );
    assert.match(errors.kind, /not a kind/);
    assert.match(errors.type, /not a type/);
    assert.match(errors.station, /not a station/);
  });

  it("rejects an Also near code that is not on the network", () => {
    const { errors } = validatePlace(draft({ alsoNear: "KJ1, XX9" }), STATIONS);
    assert.match(errors.alsoNear, /XX9/);
  });

  it("rejects a map link that is not a web address", () => {
    assert.match(
      validatePlace(draft({ map: "javascript:alert(1)" }), STATIONS).errors.map,
      /web address/,
    );
  });

  it("requires both coordinates when either is given, and bounds them", () => {
    const missing = validatePlace(draft({ lat: "3.1" }), STATIONS).errors;
    assert.match(missing.lng, /longitude/);

    const outside = validatePlace(
      draft({ lat: "1.0", lng: "200" }),
      STATIONS,
    ).errors;
    assert.match(outside.lat, /Klang Valley/);
    assert.match(outside.lng, /Klang Valley/);
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
  it("omits an absent map and coordinates rather than writing null", () => {
    const built = buildPlace(draft(), STATIONS, []);
    const record = placeRecord(built.place!, built.slug!);

    assert.deepEqual(record.alsoNear, []);
    assert.equal("map" in record, false);
    assert.equal("coordinates" in record, false);
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
  it("prefills every field a Contribution can supply", () => {
    const prefilled = contributionToDraft(CONTRIBUTION);

    assert.equal(prefilled.name, "Amcorp Service Suite");
    assert.equal(prefilled.station, "KJ20");
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
      station: "KJ20",
      alsoNear: "KJ1",
      map: "https://maps.app.goo.gl/x",
      lat: "3.1117289",
      lng: "101.6366555",
      source: "owner",
      contributorName: "Emily Yeo",
      contributorHref: "https://example.com/me",
    });

    const built = contributionToPlace(CONTRIBUTION, fields, STATIONS, []);

    assert.deepEqual(built.errors, {});
    assert.equal(built.slug, "amcorp-service-suite");
    assert.equal(built.place?.source, "contributed", "an approved Contribution is contributed");
    assert.equal(built.place?.station, "KJ20");
    assert.deepEqual(built.place?.coordinates, {
      lat: 3.1117289,
      lng: 101.6366555,
    });
    assert.deepEqual(built.place?.contributor, {
      name: "Emily Yeo",
      href: "https://example.com/me",
    });
    assert.equal(built.file?.path, "data/places/amcorp-service-suite.json");
  });

  it("carries the Contributor over when the form left them blank", () => {
    const built = contributionToPlace(
      CONTRIBUTION,
      draft({ source: "owner", contributorName: "", contributorHref: "" }),
      STATIONS,
      [],
    );

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
