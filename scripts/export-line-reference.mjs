#!/usr/bin/env node
/**
 * One-off export: the network reference for the Lines this directory covers.
 *
 * PocketBase (`POCKETBASE_URL`, default `http://pocketbase.pi`) describes the rail
 * network as it exists; `data/properties.json` holds the Stations the maintainer
 * has checked. This script copies the first into the second, by hand, and its
 * output is committed — like `scripts/measure.ts`, and never part of
 * `npm run build`, so a deploy cannot depend on PocketBase being reachable.
 *
 * It keys on station **code** (`KJ16`, `KJ37`), never on name or slug: the
 * network has renamed a Station (`Bank Rakyat Bangsar`, `Universiti`) and the
 * directory uses its own display names (`LRT Bangsar`, `LRT KL Gateway -
 * Universiti`), so a name-keyed export silently fails to resolve them.
 *
 * `CHECKED_STATION_CODES` is that mapping, taken once. The coordinate check
 * below is what proves it: a code that resolves to a Station more than
 * `MAX_DRIFT_METRES` away is a wrong mapping and fails loudly, rather than
 * stamping a checked Station with someone else's code.
 *
 * Usage: `npm run export-line`
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const DATA_PATH = resolve(root, 'data/properties.json');

const BASE_URL = process.env.POCKETBASE_URL ?? 'http://pocketbase.pi';

/** Checked Station slug → network station code. */
const CHECKED_STATION_CODES = {
  'lrt-putra-heights': 'KJ37',
  'lrt-subang-alam': 'KJ36',
  'lrt-alam-megah': 'KJ35',
  'lrt-usj-21': 'KJ34',
  'lrt-wawasan': 'KJ33',
  'lrt-taipan': 'KJ32',
  'lrt-usj-7': 'KJ31',
  'lrt-ss-18': 'KJ30',
  'lrt-ss-15': 'KJ29',
  'lrt-subang-jaya': 'KJ28',
  'lrt-cgc-glenmarie': 'KJ27',
  'lrt-ara-damansara': 'KJ26',
  'lrt-lembah-subang': 'KJ25',
  'lrt-kelana-jaya': 'KJ24',
  'lrt-taman-bahagia': 'KJ23',
  'lrt-taman-paramount': 'KJ22',
  'lrt-asia-jaya': 'KJ21',
  'lrt-taman-jaya': 'KJ20',
  'lrt-kl-gateway-universiti': 'KJ19',
  'lrt-kerinchi': 'KJ18',
  'lrt-abdullah-hukum': 'KJ17',
  'lrt-bangsar': 'KJ16',
};

/** How far a checked Station may sit from the Station its code names. */
const MAX_DRIFT_METRES = 300;

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Metres between a repo coordinate (`lng`) and a PocketBase geoPoint (`lon`). */
function metresBetween(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function fetchAll(collection) {
  const items = [];
  for (let page = 1; ; page++) {
    const url = `${BASE_URL}/api/collections/${collection}/records?perPage=200&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url}`);
    const body = await res.json();
    items.push(...body.items);
    if (page >= body.totalPages) return items;
  }
}

async function main() {
  const previous = readFileSync(DATA_PATH, 'utf-8');
  const data = JSON.parse(previous);

  if (!Array.isArray(data.stations) || !Array.isArray(data.places)) {
    throw new Error('data/properties.json has no "stations" and "places" arrays');
  }

  // The mapping and the checked Stations must describe the same set, both ways:
  // a Station with no code cannot be placed on the corridor, and a code with no
  // Station is a mapping nobody maintains.
  for (const station of data.stations) {
    if (!CHECKED_STATION_CODES[station.slug]) {
      throw new Error(
        `Checked Station "${station.slug}" has no entry in CHECKED_STATION_CODES`,
      );
    }
  }
  const checkedSlugs = new Set(data.stations.map((s) => s.slug));
  for (const slug of Object.keys(CHECKED_STATION_CODES)) {
    if (!checkedSlugs.has(slug)) {
      throw new Error(
        `CHECKED_STATION_CODES names "${slug}", which is not a checked Station anymore`,
      );
    }
  }

  const [lines, networkStations] = await Promise.all([
    fetchAll('train_lines'),
    fetchAll('train_stations'),
  ]);
  console.log(
    `Read ${lines.length} Lines and ${networkStations.length} Stations from ${BASE_URL}`,
  );

  const networkById = new Map(networkStations.map((s) => [s.id, s]));
  const byCode = new Map();
  for (const line of lines) {
    for (const id of line.stations) {
      const station = networkById.get(id);
      if (!station) {
        throw new Error(`Line ${line.code} lists Station ${id}, which is not in train_stations`);
      }
      if (byCode.has(station.code)) {
        throw new Error(`Station code ${station.code} appears on more than one Line`);
      }
      byCode.set(station.code, { line, station });
    }
  }

  // Stamp every checked Station with its code, and prove the mapping by position.
  for (const station of data.stations) {
    const code = CHECKED_STATION_CODES[station.slug];
    const hit = byCode.get(code);
    if (!hit) throw new Error(`No Line holds Station code ${code} (for "${station.slug}")`);
    if (!station.coordinates) {
      throw new Error(`Checked Station "${station.slug}" has no coordinates to verify ${code} against`);
    }
    const drift = metresBetween(station.coordinates, hit.station.geoPoint);
    if (drift > MAX_DRIFT_METRES) {
      throw new Error(
        `"${station.slug}" is ${Math.round(drift)}m from ${code} ${hit.station.name} — wrong code?`,
      );
    }
    const lineSlug = slugify(hit.line.name);
    if (station.line !== lineSlug) {
      throw new Error(
        `Checked Station "${station.slug}" says line "${station.line}", ${code} is on "${lineSlug}"`,
      );
    }
    if (!hit.station.geoPoint || typeof hit.station.geoPoint.lat !== 'number') {
      throw new Error(`Station ${code} has no usable geoPoint`);
    }
  }

  const checkedCodes = new Set(Object.values(CHECKED_STATION_CODES));

  // Only Lines with at least one checked Station. Once a Line appears, all of
  // its Stations appear: that is what lets the Browse page state what it has
  // not done yet instead of implying it has done everything.
  const coveredLines = lines.filter((line) =>
    line.stations.some((id) => checkedCodes.has(networkById.get(id).code)),
  );

  const outLines = coveredLines.map((line) => {
    const stations = line.stations
      .map((id) => networkById.get(id))
      .sort((a, b) => a.sort - b.sort)
      .map((s) => ({
        code: s.code,
        name: s.name,
        sort: s.sort,
        // PocketBase stores GeoJSON order (`lon`); the app reads `lng`.
        coordinates: { lat: s.geoPoint.lat, lng: s.geoPoint.lon },
      }));
    return {
      slug: slugify(line.name),
      code: line.code,
      name: line.name,
      color: line.color,
      stations,
    };
  });

  const out = {
    lines: outLines,
    stations: data.stations.map((s) => ({
      slug: s.slug,
      name: s.name,
      line: s.line,
      code: CHECKED_STATION_CODES[s.slug],
      ...(s.coordinates ? { coordinates: s.coordinates } : {}),
    })),
    places: data.places,
  };

  const next = JSON.stringify(out, null, 2) + '\n';
  writeFileSync(DATA_PATH, next);

  for (const line of outLines) {
    const checked = line.stations.filter((s) => checkedCodes.has(s.code));
    console.log(
      `  ${line.code} ${line.name}: ${checked.length} of ${line.stations.length} Stations checked` +
        ` — ${checked.map((s) => s.code).join(', ')}`,
    );
  }
  console.log(
    next === previous
      ? 'data/properties.json unchanged'
      : 'data/properties.json updated',
  );
}

main().catch((e) => {
  console.error(`Export failed: ${e.message}`);
  process.exit(1);
});
