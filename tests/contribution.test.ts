import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONTRIBUTION_TYPES,
  MAX_NOTE,
  buildContributionFile,
  contributionPullRequestBody,
  isGoogleMapsEmbed,
  normalizeRouteFrame,
  toConnections,
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
    map: "https://maps.app.goo.gl/amcorp",
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
      map: "https://maps.app.goo.gl/amcorp",
      note: null,
      contributor: null,
    });
  });

  it("requires a place name", () => {
    assert.match(errorsFor({ name: "" }).name, /Give the place a name/);
    assert.match(errorsFor({ name: "   " }).name, /Give the place a name/);
  });

  it("requires a Map link", () => {
    assert.match(errorsFor({ map: "" }).map, /Map link/);
    assert.match(errorsFor({ map: "   " }).map, /Map link/);
  });

  it("accepts several Connections, each carrying its own Route frame", () => {
    const embed = "https://www.google.com/maps/embed?pb=!3e2!walk";
    const { errors, contribution } = validateContribution(
      draft({
        connections: [
          { station: "KJ20", embed },
          { station: "AG1", embed: "" },
        ],
      }),
      STATIONS,
      TYPES,
    );

    assert.deepEqual(errors, {});
    assert.deepEqual(contribution?.connections, [
      { station: "KJ20", embed },
      { station: "AG1", embed: null },
    ]);
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

  it("rejects a Route frame that is not a Google Maps embed", () => {
    assert.match(
      errorsFor({
        connections: [{ station: "KJ20", embed: "https://maps.app.goo.gl/x" }],
      }).connections,
      /Google Maps embed/,
    );
    assert.match(
      errorsFor({
        connections: [
          {
            station: "KJ20",
            embed: "https://www.google.com/maps/dir/?api=1&origin=a&destination=b",
          },
        ],
      }).connections,
      /Google Maps embed/,
    );
    assert.equal(
      errorsFor({
        connections: [
          {
            station: "KJ20",
            embed: "https://www.google.com/maps/embed?pb=!3e2!walk",
          },
        ],
      }).connections,
      undefined,
    );
  });

  it("accepts a Route frame pasted as a whole <iframe> tag, stored as the bare URL", () => {
    const { errors, contribution } = validateContribution(
      draft({
        connections: [
          {
            station: "KJ20",
            embed:
              '<iframe src="https://www.google.com/maps/embed?pb=!3e2!walk" width="600" height="450" loading="lazy"></iframe>',
          },
        ],
      }),
      STATIONS,
      TYPES,
    );

    assert.deepEqual(errors, {});
    assert.equal(
      contribution?.connections[0].embed,
      "https://www.google.com/maps/embed?pb=!3e2!walk",
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

describe("normalizeRouteFrame", () => {
  const WALK = "https://www.google.com/maps/embed?pb=!3e2!walk";

  it("extracts the src from a whole <iframe> tag", () => {
    assert.equal(
      normalizeRouteFrame(
        `<iframe src="${WALK}" width="600" height="450" style="border:0;" loading="lazy"></iframe>`,
      ),
      WALK,
    );
  });

  it("normalises an iframe and the bare URL to the same stored link", () => {
    assert.equal(normalizeRouteFrame(`<iframe src="${WALK}"></iframe>`), WALK);
    assert.equal(normalizeRouteFrame(WALK), WALK);
  });

  it("decodes the HTML entity an iframe src carries", () => {
    assert.equal(
      normalizeRouteFrame(
        '<iframe src="https://www.google.com/maps/embed?pb=a&amp;b"></iframe>',
      ),
      "https://www.google.com/maps/embed?pb=a&b",
    );
  });

  it("forces the stored frame to the walking mode segment", () => {
    assert.equal(
      normalizeRouteFrame("https://www.google.com/maps/embed?pb=!3e0!drive"),
      "https://www.google.com/maps/embed?pb=!3e2!drive",
    );
    assert.equal(
      normalizeRouteFrame(
        '<iframe src="https://www.google.com/maps/embed?pb=!3e1!cycle"></iframe>',
      ),
      "https://www.google.com/maps/embed?pb=!3e2!cycle",
    );
  });

  it("leaves a non-embed link for the strict predicate to refuse", () => {
    const share = "https://maps.app.goo.gl/rk7aw2Jn3MBU82iS9";
    const directions =
      "https://www.google.com/maps/dir/?api=1&origin=a&destination=b";
    assert.equal(normalizeRouteFrame(share), share);
    assert.equal(normalizeRouteFrame(directions), directions);
  });

  it("is null for a blank paste", () => {
    assert.equal(normalizeRouteFrame("   "), null);
  });
});

describe("toConnections", () => {
  it("normalises a pasted iframe into the stored bare walking link", () => {
    assert.deepEqual(
      toConnections([
        {
          station: "KJ20",
          embed:
            '<iframe src="https://www.google.com/maps/embed?pb=!3e0!drive"></iframe>',
        },
      ]),
      [
        {
          station: "KJ20",
          embed: "https://www.google.com/maps/embed?pb=!3e2!drive",
        },
      ],
    );
  });
});

describe("isGoogleMapsEmbed", () => {
  it("accepts a Google Maps embed link", () => {
    assert.equal(
      isGoogleMapsEmbed("https://www.google.com/maps/embed?pb=!3e2!walk"),
      true,
    );
    assert.equal(
      isGoogleMapsEmbed("https://maps.google.com/maps/embed?pb=!3e2!walk"),
      true,
    );
    assert.equal(
      isGoogleMapsEmbed("https://google.com/maps/embed?pb=x"),
      true,
    );
  });

  it("refuses a share link, a directions link and any other address", () => {
    assert.equal(
      isGoogleMapsEmbed("https://maps.app.goo.gl/rk7aw2Jn3MBU82iS9"),
      false,
    );
    assert.equal(
      isGoogleMapsEmbed(
        "https://www.google.com/maps/dir/?api=1&origin=a&destination=b",
      ),
      false,
    );
    assert.equal(isGoogleMapsEmbed("https://www.google.com/maps/embed"), false);
    assert.equal(isGoogleMapsEmbed("https://example.com/maps/embed?pb=x"), false);
    assert.equal(
      isGoogleMapsEmbed("https://translate.google.com/maps/embed?pb=x"),
      false,
    );
    assert.equal(isGoogleMapsEmbed("not a url"), false);
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
      map: "https://maps.app.goo.gl/amcorp",
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
