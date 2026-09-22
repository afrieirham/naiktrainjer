import networkData from "../../data/network.json" with { type: "json" };
import type { Place } from "../lib/browse-filter";
import type { Line } from "../lib/lines";

/**
 * The one place the directory's data enters the app. Every route reads the Line
 * and Place records through this module, so the storage can move from one file
 * to one file per record without touching them.
 *
 * The directory is the network (`data/network.json`) plus the Place records.
 * There is no separate Station entity: a Station comes from the network, and a
 * Station is covered when it holds a Place.
 *
 * The app is bundled by Vite, so it globs the Place records with Vite's
 * `import.meta.glob`. Node cannot use that, and reads the same files through
 * `directory.node.ts`; the two entries must stay in step.
 */
const placeModules = import.meta.glob("../../data/places/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Place>;

export const lines = networkData.lines as Line[];
export const places = Object.values(placeModules);
