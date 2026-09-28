import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stationOptionLabel, stationsByCode, type Line } from "../app/lib/lines.ts";
import { lines } from "../app/data/directory.node.ts";

const BUILD_DIR = resolve(import.meta.dirname, "../build/client");

function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/g, "");
}

/**
 * A small, explicit network whose Line order differs from the alphabetical
 * order of the Line names, so the two cannot be confused.
 */
const lineX: Line = {
  slug: "x",
  code: "X",
  name: "Middle",
  color: "#111111",
  stations: [{ code: "X1", name: "Junction", sort: 1, interchange: ["Y1", "Z1"] }],
};
const lineY: Line = {
  slug: "y",
  code: "Y",
  name: "Zulu",
  color: "#222222",
  stations: [{ code: "Y1", name: "Junction", sort: 1, interchange: ["X1", "Z1"] }],
};
const lineZ: Line = {
  slug: "z",
  code: "Z",
  name: "Alpha",
  color: "#333333",
  stations: [{ code: "Z1", name: "Junction", sort: 1, interchange: ["X1", "Y1"] }],
};
const lineW: Line = {
  slug: "w",
  code: "W",
  name: "West",
  color: "#444444",
  stations: [{ code: "W1", name: "Onward", sort: 1 }],
};
const network: Line[] = [lineX, lineY, lineZ, lineW];

describe("stationOptionLabel", () => {
  it("reads a plain Station as `<code> <name>`", () => {
    const station = stationsByCode(network).get("W1")!;
    assert.equal(stationOptionLabel(station, network), "W1 Onward");
  });

  it("joins an Interchange Station's twin codes in the network's Line order", () => {
    const station = stationsByCode(network).get("X1")!;
    assert.equal(
      stationOptionLabel(station, network),
      "X1/Y1/Z1 Junction · Alpha, Zulu",
    );
  });

  it("names the same Interchange Station the same way for every twin", () => {
    const byCode = stationsByCode(network);
    const label = stationOptionLabel(byCode.get("X1")!, network);
    assert.equal(stationOptionLabel(byCode.get("Y1")!, network), label);
    assert.equal(stationOptionLabel(byCode.get("Z1")!, network), label);
  });

  it("names Masjid Jamek's joined codes and the other Lines it reaches", () => {
    const byCode = stationsByCode(lines);
    const expected = "AG7/SP7/KJ13 Masjid Jamek · Kelana Jaya, Sri Petaling";
    for (const code of ["AG7", "SP7", "KJ13"]) {
      assert.equal(stationOptionLabel(byCode.get(code)!, lines), expected);
    }
  });
});

describe("the shared picker's Station control", () => {
  let pickerHtml: string;

  before(() => {
    pickerHtml = stripComments(
      readFileSync(resolve(BUILD_DIR, "contribute", "index.html"), "utf-8"),
    );
  });

  it("sets the Station select in tabular-nums, like the rest of the site", () => {
    const select = pickerHtml.match(
      /<select aria-label="Station 1"[^>]*class="([^"]*)"/,
    );
    assert.ok(select, "The Station select must render on the Contribute page");
    assert.ok(
      select![1].split(/\s+/).includes("tabular-nums"),
      `The Station picker's options carry station codes, so the control must be tabular-nums, got "${select![1]}"`,
    );
  });
});
