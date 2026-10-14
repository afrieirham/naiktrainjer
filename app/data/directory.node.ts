import { lines as networkLines } from "../../data/network.ts";
import { places as snapshotPlaces } from "../../data/places.ts";
import type { Place } from "../lib/browse-filter";
import type { Line } from "../lib/lines";

/**
 * The Node entry to the directory: the same records as `directory.ts`, read from
 * the committed snapshot `data/places.ts` with Node's type-stripping. Tests and
 * scripts import this one; the app imports `directory.ts`. Keep the two entries
 * in step.
 */
export const lines = networkLines as Line[];
export const places: Place[] = snapshotPlaces;
