import propertiesData from "../../data/properties.json" with { type: "json" };
import type { Place, Station } from "../lib/browse-filter";
import type { Line } from "../lib/lines";

/**
 * The one place the directory's data enters the app. Every route, script and
 * test reads the Line, Station and Place records through this module, so the
 * storage can move from one file to one file per record without touching them.
 */
export const lines = propertiesData.lines as Line[];
export const stations = propertiesData.stations as Station[];
export const places = propertiesData.places as Place[];
