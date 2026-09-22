#!/usr/bin/env node
/**
 * One-off migration: split `data/properties.json` into the per-record layout.
 *
 * It has already been run, and the file it read is gone — this script is kept for
 * provenance, like `convert-data.mjs`, not for the build. It is not part of
 * `npm run build` or the test suite, and nothing else in the repo reads
 * `data/properties.json`. To re-run it, restore the source first:
 * `git show <commit>:data/properties.json > data/properties.json`.
 *
 * What it does:
 *   - writes `data/stations.json` — the checked Stations array, transitional.
 *   - writes one `data/places/<slug>.json` per Place, naming its Station and each
 *     Also near by network code instead of checked-Station slug, and renaming
 *     source `submitted` to `contributed`.
 *   - deletes `data/properties.json`.
 *
 * The slug → code map comes from the source's own `stations[]` array, which holds
 * both; there is no hand-maintained mapping table.
 *
 * Usage: `node scripts/migrate-data.mjs`
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const SOURCE = resolve(root, 'data/properties.json');
const PLACES_DIR = resolve(root, 'data/places');
const STATIONS = resolve(root, 'data/stations.json');

function main() {
  const data = JSON.parse(readFileSync(SOURCE, 'utf-8'));

  const codeBySlug = new Map(data.stations.map((station) => [station.slug, station.code]));

  const toCode = (slug, label) => {
    const code = codeBySlug.get(slug);
    if (!code) throw new Error(`${label}: no network code for checked Station "${slug}"`);
    return code;
  };

  mkdirSync(PLACES_DIR, { recursive: true });
  writeFileSync(STATIONS, JSON.stringify(data.stations, null, 2) + '\n');

  for (const place of data.places) {
    const record = {
      slug: place.slug,
      name: place.name,
      kind: place.kind,
      type: place.type,
      station: toCode(place.station, place.slug),
      alsoNear: (place.alsoNear ?? []).map((slug) => toCode(slug, place.slug)),
    };
    if (place.map) record.map = place.map;
    if (place.coordinates) record.coordinates = place.coordinates;
    record.source = place.source === 'submitted' ? 'contributed' : place.source;

    writeFileSync(resolve(PLACES_DIR, `${place.slug}.json`), JSON.stringify(record, null, 2) + '\n');
  }

  rmSync(SOURCE);
  console.log(
    `Split ${data.places.length} Places into ${PLACES_DIR}, ` +
      `wrote ${data.stations.length} checked Stations to data/stations.json, ` +
      `removed data/properties.json`,
  );
}

main();
