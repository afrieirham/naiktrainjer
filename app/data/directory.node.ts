import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { lines as networkLines } from "../../data/network.ts";
import type { Place } from "../lib/browse-filter";
import type { Line } from "../lib/lines";

/**
 * The Node entry to the directory: the same records as `directory.ts`, read with
 * `node:fs` because Vite's `import.meta.glob` only exists inside the bundler.
 * Tests and scripts import this one; the app imports `directory.ts`. Keep the two
 * entries in step.
 */
const placesDir = resolve(import.meta.dirname, "../../data/places");

export const lines = networkLines as Line[];
export const places = readdirSync(placesDir)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => JSON.parse(readFileSync(resolve(placesDir, name), "utf-8")) as Place);
