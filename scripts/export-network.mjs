#!/usr/bin/env node
/**
 * Sync the network reference from PocketBase: every Line and every Station.
 *
 * PocketBase (`POCKETBASE_URL`, default `http://pocketbase.pi`) describes the rail
 * network as it exists; `data/network.json` is the committed snapshot the app
 * reads. This script copies the first into the second, whole. It is run by hand,
 * exactly like the Measure script, and is never part of `npm run build`, so a
 * deploy cannot depend on PocketBase being reachable.
 *
 * The export is a plain snapshot: every Line and every Station, each Station on
 * its own `sort`, with no filtering. A Station the directory has never used still
 * lands here, because the Contribution form can name any Station on any Line.
 *
 * Usage: `npm run export-network`
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const DATA_PATH = resolve(root, 'data/network.json');

const BASE_URL = process.env.POCKETBASE_URL ?? 'http://pocketbase.pi';

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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
  const [lines, networkStations] = await Promise.all([
    fetchAll('train_lines'),
    fetchAll('train_stations'),
  ]);
  console.log(
    `Read ${lines.length} Lines and ${networkStations.length} Stations from ${BASE_URL}`,
  );

  const networkById = new Map(networkStations.map((s) => [s.id, s]));

  const outLines = lines.map((line) => {
    const stations = line.stations
      .map((id) => {
        const station = networkById.get(id);
        if (!station) {
          throw new Error(
            `Line ${line.code} lists Station ${id}, which is not in train_stations`,
          );
        }
        if (!station.geoPoint || typeof station.geoPoint.lat !== 'number') {
          throw new Error(`Station ${station.code} has no usable geoPoint`);
        }
        return station;
      })
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

  const out = { lines: outLines };
  const next = JSON.stringify(out, null, 2) + '\n';
  writeFileSync(DATA_PATH, next);

  for (const line of outLines) {
    console.log(`  ${line.code} ${line.name}: ${line.stations.length} Stations`);
  }
  const total = outLines.reduce((n, l) => n + l.stations.length, 0);
  console.log(`Wrote ${outLines.length} Lines and ${total} Stations to data/network.json`);
}

main().catch((e) => {
  console.error(`Export failed: ${e.message}`);
  process.exit(1);
});
