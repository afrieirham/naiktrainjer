import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Place } from "../lib/browse-filter";
import type { Line } from "../lib/lines";

/**
 * The Node entry to the directory: the same records as `directory.ts`, read with
 * `node:fs` because Vite's `import.meta.glob` only exists inside the bundler.
 * Tests and scripts import this one; the app imports `directory.ts`. Keep the two
 * entries in step.
 */
const dataDir = resolve(import.meta.dirname, "../../data");
const placesDir = resolve(dataDir, "places");

const networkData = JSON.parse(readFileSync(resolve(dataDir, "network.json"), "utf-8"));

export const lines = networkData.lines as Line[];
export const places = readdirSync(placesDir)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => JSON.parse(readFileSync(resolve(placesDir, name), "utf-8")) as Place);
