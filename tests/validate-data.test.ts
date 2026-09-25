import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { places } from "../app/data/directory.node.ts";

const root = resolve(import.meta.dirname, "..");
const placesDir = resolve(root, "data/places");

let output: string;

before(() => {
  output = execFileSync("node", ["scripts/validate-data.mjs"], {
    cwd: root,
    encoding: "utf-8",
  });
});

describe("validate-data.mjs", () => {
  it("passes on the per-record layout", () => {
    assert.ok(
      output.includes("✓ Valid"),
      `Expected a success message, got: ${output}`,
    );
  });

  it("sees one file per Place, and the validator agrees with the loader", () => {
    const files = readdirSync(placesDir).filter((name) => name.endsWith(".json"));
    assert.equal(
      files.length,
      places.length,
      `Expected one file per Place: ${places.length} records, ${files.length} files`,
    );

    const match = output.match(/Valid: (\d+) Places/);
    assert.ok(match, `Expected the validator to report its Place count, got: ${output}`);
    assert.equal(
      Number(match[1]),
      places.length,
      "The validator and the loader must agree on the number of Place records",
    );
  });

  it("refuses a Route frame that is not a Google Maps embed", () => {
    const dir = mkdtempSync(join(tmpdir(), "naiktrainjer-places-"));
    try {
      writeFileSync(
        join(dir, "bad.json"),
        JSON.stringify({
          slug: "bad",
          name: "Bad",
          kind: "building",
          type: "condominium",
          map: "https://maps.app.goo.gl/x",
          connections: [
            { station: "AG1", embed: "https://maps.app.goo.gl/not-an-embed" },
          ],
          source: "owner",
        }),
      );

      assert.throws(
        () =>
          execFileSync("node", ["scripts/validate-data.mjs", dir], {
            cwd: root,
            encoding: "utf-8",
          }),
        (error: unknown) =>
          ((error as { stderr?: string }).stderr ?? "").includes(
            "not a Google Maps embed link",
          ),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
