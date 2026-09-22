import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const VALID_KINDS = ['building', 'area'];
const VALID_TYPES = [
  'condominium', 'service-apartment', 'apartment', 'flat',
  'terrace', 'shop-office', 'area',
];
// Klang Valley plausible bounds
const LAT_MIN = 2.9, LAT_MAX = 3.3;
const LNG_MIN = 101.4, LNG_MAX = 101.8;

const errors = [];

function err(msg) { errors.push(msg); }

try {
  const network = JSON.parse(readFileSync(resolve(root, 'data/network.json'), 'utf-8'));
  const stations = JSON.parse(readFileSync(resolve(root, 'data/stations.json'), 'utf-8'));

  const placesDir = resolve(root, 'data/places');
  const placeFiles = readdirSync(placesDir).filter((name) => name.endsWith('.json')).sort();
  const places = placeFiles.map((name) => {
    try {
      return { ...JSON.parse(readFileSync(resolve(placesDir, name), 'utf-8')), __file: name };
    } catch (e) {
      err(`data/places/${name}: invalid JSON — ${e.message}`);
      return null;
    }
  }).filter(Boolean);

  // Top-level shape
  if (!Array.isArray(network.lines)) err('data/network.json: missing or non-array "lines"');
  if (!Array.isArray(stations)) err('data/stations.json: missing or non-array Stations');
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

  const lines = network.lines;

  // Line shape: every Line the network holds, with all of its Stations.
  const lineSlugs = new Set();
  const lineCodes = new Set();
  const corridor = new Map(); // station code → line slug
  for (const line of lines) {
    const label = line.name || line.slug || '(unknown line)';

    if (!line.slug) err(`Line "${label}": missing slug`);
    else if (lineSlugs.has(line.slug)) err(`Line "${label}": duplicate slug "${line.slug}"`);
    else lineSlugs.add(line.slug);

    if (!line.code) err(`Line "${label}": missing code`);
    else if (lineCodes.has(line.code)) err(`Line "${label}": duplicate code "${line.code}"`);
    else lineCodes.add(line.code);

    if (!line.name) err(`Line "${line.slug}": missing name`);

    if (typeof line.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(line.color))
      err(`Line "${label}": invalid colour ${JSON.stringify(line.color)} — expected #rrggbb`);

    if (!Array.isArray(line.stations) || line.stations.length === 0) {
      err(`Line "${label}": missing or empty "stations"`);
      continue;
    }

    const seenSorts = new Set();
    for (const s of line.stations) {
      const stationLabel = `${line.slug}/${s.code ?? '(no code)'}`;
      if (!s.code) err(`Line "${label}": a Station is missing its code`);
      else if (corridor.has(s.code)) err(`Duplicate station code "${s.code}" on Line "${label}"`);
      else corridor.set(s.code, line.slug);

      if (!s.name) err(`Line "${label}": Station "${s.code}" is missing a name`);

      if (typeof s.sort !== 'number' || !Number.isFinite(s.sort))
        err(`Line "${label}": Station "${stationLabel}" has no corridor position (sort)`);
      else if (seenSorts.has(s.sort))
        err(`Line "${label}": two Stations share corridor position ${s.sort}`);
      else seenSorts.add(s.sort);

      if (s.coordinates) {
        const c = s.coordinates;
        if (typeof c.lat !== 'number') err(`Station "${stationLabel}": coordinates.lat is not a number`);
        else if (c.lat < LAT_MIN || c.lat > LAT_MAX) err(`Station "${stationLabel}": coordinates.lat ${c.lat} outside Klang Valley range [${LAT_MIN}, ${LAT_MAX}]`);
        if (typeof c.lng !== 'number') err(`Station "${stationLabel}": coordinates.lng is not a number`);
        else if (c.lng < LNG_MIN || c.lng > LNG_MAX) err(`Station "${stationLabel}": coordinates.lng ${c.lng} outside Klang Valley range [${LNG_MIN}, ${LNG_MAX}]`);
      }
    }
  }

  // Station index — the Stations that have been checked, each on its Line.
  const stationSlugs = new Set();
  for (const s of stations) {
    if (!s.slug) err(`Station missing slug: ${JSON.stringify(s)}`);
    if (!s.name) err(`Station missing name: ${JSON.stringify(s)}`);
    if (!s.line) err(`Station missing line: ${JSON.stringify(s)}`);
    if (s.slug && stationSlugs.has(s.slug)) err(`Duplicate station slug: ${s.slug}`);
    if (s.slug) stationSlugs.add(s.slug);

    // A checked Station sits on a Line the network actually holds, at a position
    // that Line actually has.
    if (s.line && !lineSlugs.has(s.line)) {
      err(`Station "${s.name}": line "${s.line}" is not in the lines list`);
    }
    if (!s.code) err(`Station "${s.name}": missing code`);
    else if (!corridor.has(s.code))
      err(`Station "${s.name}": code "${s.code}" does not resolve to a Station on any Line`);
    else if (s.line && corridor.get(s.code) !== s.line)
      err(`Station "${s.name}": code "${s.code}" belongs to Line "${corridor.get(s.code)}", not "${s.line}"`);

    if (s.coordinates) {
      const c = s.coordinates;
      if (typeof c.lat !== 'number') err(`Station "${s.name}": coordinates.lat is not a number`);
      else if (c.lat < LAT_MIN || c.lat > LAT_MAX) err(`Station "${s.name}": coordinates.lat ${c.lat} outside Klang Valley range [${LAT_MIN}, ${LAT_MAX}]`);
      if (typeof c.lng !== 'number') err(`Station "${s.name}": coordinates.lng is not a number`);
      else if (c.lng < LNG_MIN || c.lng > LNG_MAX) err(`Station "${s.name}": coordinates.lng ${c.lng} outside Klang Valley range [${LNG_MIN}, ${LNG_MAX}]`);
    }
  }

  // Place validation — one file per Place, each keyed by network code.
  const placeSlugs = new Set();
  for (const p of places) {
    const label = p.name || p.slug || p.__file;

    // slug
    if (!p.slug) err(`${label}: missing slug`);
    else {
      if (placeSlugs.has(p.slug)) err(`${label}: duplicate slug "${p.slug}"`);
      placeSlugs.add(p.slug);
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(p.slug) && p.slug.length > 1)
        err(`${label}: slug "${p.slug}" is not url-safe`);
      if (p.slug.length === 1 && !/^[a-z0-9]$/.test(p.slug))
        err(`${label}: slug "${p.slug}" is not url-safe`);
      if (p.__file !== `${p.slug}.json`)
        err(`${label}: file "${p.__file}" does not match slug "${p.slug}"`);
    }

    // name
    if (!p.name) err(`${label}: missing name`);

    // kind
    if (!VALID_KINDS.includes(p.kind)) err(`${label}: invalid kind "${p.kind}"`);

    // type
    if (!VALID_TYPES.includes(p.type)) err(`${label}: invalid type "${p.type}"`);

    // station — a network station code
    if (!p.station) err(`${label}: missing station`);
    else if (p.station.includes(',')) err(`${label}: station contains comma (glued field): "${p.station}"`);
    else if (!corridor.has(p.station)) err(`${label}: station "${p.station}" does not resolve to a network station code`);

    // alsoNear — network station codes
    if (Array.isArray(p.alsoNear)) {
      for (const an of p.alsoNear) {
        if (an.includes(',')) err(`${label}: alsoNear contains comma: "${an}"`);
        else if (!corridor.has(an)) err(`${label}: alsoNear station "${an}" does not resolve to a network station code`);
      }
    }

    // map (optional — no validation needed)

    // coordinates (optional, but if present must be valid)
    if (p.coordinates) {
      const c = p.coordinates;
      if (typeof c.lat !== 'number') err(`${label}: coordinates.lat is not a number`);
      else if (c.lat < LAT_MIN || c.lat > LAT_MAX) err(`${label}: coordinates.lat ${c.lat} outside Klang Valley range [${LAT_MIN}, ${LAT_MAX}]`);
      if (typeof c.lng !== 'number') err(`${label}: coordinates.lng is not a number`);
      else if (c.lng < LNG_MIN || c.lng > LNG_MAX) err(`${label}: coordinates.lng ${c.lng} outside Klang Valley range [${LNG_MIN}, ${LNG_MAX}]`);
    }

    // source
    if (p.source && !['owner', 'contributed'].includes(p.source))
      err(`${label}: invalid source "${p.source}"`);

    // walkMinutes / walkMeters / driveMinutes must NOT be present
    if ('walkMinutes' in p) err(`${label}: walkMinutes must not be present (issue #10)`);
    if ('walkMeters' in p) err(`${label}: walkMeters must not be present (issue #10)`);
    if ('driveMinutes' in p) err(`${label}: driveMinutes must not be present (issue #10)`);
  }

  if (errors.length) {
    console.error(`Validation failed with ${errors.length} error(s):\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  const lineStationCount = lines.reduce((n, line) => n + (line.stations?.length ?? 0), 0);
  console.log(
    `✓ Valid: ${places.length} Places across ${placeFiles.length} files, ${stations.length} of ${lineStationCount} Stations checked` +
      ` on ${lines.length} Line${lines.length === 1 ? '' : 's'}.`,
  );
} catch (e) {
  console.error(`Validation error: ${e.message}`);
  process.exit(1);
}
