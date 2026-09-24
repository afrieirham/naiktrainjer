import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONTRIBUTION_TYPES,
  MAX_NOTE,
  buildContributionFile,
  contributionPullRequestBody,
  validateContribution,
  validateFields,
  type ContributionDraft,
} from "../app/lib/contribution.ts";

const STATIONS = ["KJ1", "KJ20", "AG1"];
const TYPES = [...CONTRIBUTION_TYPES];

function draft(overrides: Partial<ContributionDraft> = {}): ContributionDraft {
  return {
    name: "Amcorp Service Suite",
    connections: [{ station: "KJ20", embed: "" }],
    type: "",
    map: "",
    note: "",
    contributorName: "",
    contributorHref: "",
    ...overrides,
  };
}

function connections(station: string): ContributionDraft["connections"] {
  return [{ station, embed: "" }];
}

function errorsFor(overrides: Partial<ContributionDraft>): Record<string, string> {
  return validateContribution(draft(overrides), STATIONS, TYPES).errors;
}

describe("validateContribution", () => {
  it("accepts a contribution with only the required fields", () => {
    const { errors, contribution } = validateContribution(
      draft(),
      STATIONS,
      TYPES,
    );

    assert.deepEqual(errors, {});
    assert.deepEqual(contribution, {
      name: "Amcorp Service Suite",
      connections: [{ station: "KJ20", embed: null }],
      type: null,
      map: null,
      note: null,
      contributor: null,
    });
  });

  it("requires a place name", () => {
    assert.match(errorsFor({ name: "" }).name, /Give the place a name/);
    assert.match(errorsFor({ name: "   " }).name, /Give the place a name/);
  });

  it("rejects a name longer than the limit", () => {
    assert.match(errorsFor({ name: "a".repeat(121) }).name, /under 120/);
  });

  it("requires a Connection whose Station exists on the network", () => {
    assert.match(
      errorsFor({ connections: connections("") }).connections,
      /at least one station/,
    );
    assert.match(
      errorsFor({ connections: connections("XX9") }).connections,
      /not a station/,
    );
  });

  it("rejects a Type that is not in the controlled list", () => {
    assert.match(errorsFor({ type: "castle" }).type, /not a type/);
    assert.equal(errorsFor({ type: "condominium" }).type, undefined);
  });

  it("rejects a map link that is not a web address", () => {
    assert.match(errorsFor({ map: "javascript:alert(1)" }).map, /web address/);
    assert.match(errorsFor({ map: "not a url" }).map, /web address/);
    assert.equal(
      errorsFor({ map: "https://maps.app.goo.gl/x" }).map,
      undefined,
    );
  });

  it("rejects a contributor link that is not a web address", () => {
    assert.match(
      errorsFor({ contributorHref: "not a url" }).contributorHref,
      /web address/,
    );
    assert.equal(
      errorsFor({ contributorHref: "https://example.com/me" }).contributorHref,
      undefined,
    );
  });

  it("rejects a note longer than the limit", () => {
    assert.match(
      errorsFor({ note: "a".repeat(MAX_NOTE + 1) }).note,
      /under 280/,
    );
  });

  it("keeps the optional detail when it is given", () => {
    const { contribution } = validateContribution(
      draft({
        type: "service-apartment",
        map: "https://maps.app.goo.gl/x",
        note: "  Ten minutes from the station.  ",
        contributorName: "  Emily Yeo ",
        contributorHref: "https://example.com/me",
      }),
      STATIONS,
      TYPES,
    );

    assert.deepEqual(contribution, {
      name: "Amcorp Service Suite",
      connections: [{ station: "KJ20", embed: null }],
      type: "service-apartment",
      map: "https://maps.app.goo.gl/x",
      note: "Ten minutes from the station.",
      contributor: { name: "Emily Yeo", href: "https://example.com/me" },
    });
  });

  it("a blank Contributor becomes nobody rather than an empty person", () => {
    const { contribution } = validateContribution(
      draft({ contributorName: "   " }),
      STATIONS,
      TYPES,
    );

    assert.equal(contribution?.contributor, null);
  });

  it("reports every problem at once", () => {
    const errors = errorsFor({
      name: "",
      connections: connections("XX9"),
      type: "castle",
    });

    assert.deepEqual(Object.keys(errors).sort(), ["connections", "name", "type"]);
  });

  it("validateFields is the same rules without building a record", () => {
    assert.deepEqual(validateFields(draft(), STATIONS, TYPES), {});
    assert.match(validateFields(draft({ name: "" }), STATIONS, TYPES).name, /name/);
  });
});

describe("buildContributionFile", () => {
  it("writes one record at data/contributions/<id>.json", () => {
    const { contribution } = validateContribution(draft(), STATIONS, TYPES);
    const file = buildContributionFile(contribution!, "c-abc12345");

    assert.equal(file.path, "data/contributions/c-abc12345.json");
    assert.deepEqual(JSON.parse(file.contents), {
      id: "c-abc12345",
      name: "Amcorp Service Suite",
      connections: [{ station: "KJ20" }],
      type: null,
      map: null,
      note: null,
      contributor: null,
    });
    assert.ok(file.contents.endsWith("\n"), "The record file ends with a newline");
  });
});

describe("contributionPullRequestBody", () => {
  it("names the place, the Station and the Contribution", () => {
    const { contribution } = validateContribution(
      draft({ contributorName: "Emily Yeo" }),
      STATIONS,
      TYPES,
    );
    const body = contributionPullRequestBody(
      contribution!,
      "c-abc12345",
      "KLCC",
    );

    assert.ok(body.includes("Amcorp Service Suite"), "body names the place");
    assert.ok(body.includes("KLCC"), "body names the Station");
    assert.ok(body.includes("KJ20"), "body carries the Station code");
    assert.ok(body.includes("c-abc12345"), "body carries the Contribution id");
    assert.ok(body.includes("Emily Yeo"), "body credits the Contributor");
    assert.ok(
      body.includes("never rendered"),
      "body states that a Contribution is not a Place",
    );
  });
});
