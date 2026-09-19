import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createProvider, type Provider, type ProviderName } from "./measure-providers.ts";

const DATA_PATH = resolve(import.meta.dirname, "../data/properties.json");

interface PlaceData {
  slug: string;
  name: string;
  kind: string;
  type: string;
  station: string;
  alsoNear?: string[];
  map?: string;
  coordinates?: { lat: number; lng: number };
  source?: string;
  walkMinutes?: number;
  walkMeters?: number;
  driveMinutes?: number;
}

interface StationData {
  slug: string;
  name: string;
  line: string;
  coordinates?: { lat: number; lng: number };
}

interface DataFile {
  stations: StationData[];
  places: PlaceData[];
}

function parseArgs(): { provider: ProviderName; dryRun: boolean } {
  const args = process.argv.slice(2);
  let provider: ProviderName = "google";
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--provider" && args[i + 1]) {
      provider = args[++i] as ProviderName;
    }
  }

  return { provider, dryRun };
}

export async function measurePlaces(
  data: DataFile,
  provider: Provider,
  dryRun: boolean,
): Promise<{ measured: number; failed: string[]; skipped: string[]; unchanged: number }> {
  const stationMap = new Map(data.stations.map((s) => [s.slug, s]));
  const measured: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];
  let unchanged = 0;

  for (const place of data.places) {
    if (place.walkMinutes !== undefined && place.walkMeters !== undefined && place.driveMinutes !== undefined) {
      unchanged++;
      continue;
    }

    if (!place.coordinates) {
      skipped.push(`${place.slug} (no Place coordinates — add its map link to data file)`);
      continue;
    }

    const station = stationMap.get(place.station);
    if (!station) {
      skipped.push(`${place.slug} (unknown station: ${place.station})`);
      continue;
    }

    if (!station.coordinates) {
      skipped.push(`${place.slug} (station "${station.name}" has no coordinates)`);
      continue;
    }

    try {
      const measurement = await provider.measure(
        place.coordinates,
        place.name,
        station.coordinates,
        station.name,
      );

      if (!dryRun) {
        place.walkMinutes = measurement.walkMinutes;
        place.walkMeters = measurement.walkMeters;
        place.driveMinutes = measurement.driveMinutes;
      }

      measured.push(place.slug);
    } catch (err) {
      failed.push(`${place.slug} (${err instanceof Error ? err.message : "unknown error"})`);
    }
  }

  return { measured: measured.length, failed, skipped, unchanged };
}

export function formatWalkTime(minutes: number, meters: number): string {
  const walkMinText = minutes === 1 ? "1 min" : `${minutes} min`;
  const km = meters / 1000;
  const walkDistText = km < 1 ? `${meters} m` : `${km.toFixed(1)} km`;
  return `${walkMinText} / ${walkDistText} walk`;
}

export function formatDriveTime(minutes: number): string {
  return minutes === 1 ? "1 min drive" : `${minutes} min drive`;
}

async function main() {
  const { provider: providerName, dryRun } = parseArgs();

  const data: DataFile = JSON.parse(readFileSync(DATA_PATH, "utf-8"));

  let provider: Provider;
  if (providerName === "google") {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Error: GOOGLE_MAPS_API_KEY environment variable is required for google provider");
      process.exit(1);
    }
    provider = createProvider("google", { apiKey });
  } else if (providerName === "ors") {
    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) {
      console.error("Error: ORS_API_KEY environment variable is required for ors provider");
      process.exit(1);
    }
    provider = createProvider("ors", { apiKey });
  } else {
    provider = createProvider("fake");
  }

  const result = await measurePlaces(data, provider, dryRun);

  if (!dryRun && result.measured > 0) {
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
  }

  console.log(`Measured: ${result.measured} places`);
  console.log(`Unchanged: ${result.unchanged} places`);
  console.log(`Skipped: ${result.skipped.length} places`);
  console.log(`Failed: ${result.failed.length} places`);

  if (result.skipped.length > 0) {
    console.log("\nSkipped places:");
    for (const s of result.skipped) {
      console.log(`  - ${s}`);
    }
  }

  if (result.failed.length > 0) {
    console.error("\nFailed places:");
    for (const f of result.failed) {
      console.error(`  - ${f}`);
    }
  }

  process.exit(result.failed.length > 0 ? 1 : 0);
}

const isMainModule = process.argv[1] &&
  (import.meta.url === `file://${process.argv[1]}` ||
   import.meta.url.endsWith(process.argv[1]));
if (isMainModule) {
  main();
}
