import { readFileSync } from 'fs';
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
  const raw = readFileSync(resolve(root, 'data/properties.json'), 'utf-8');
  const data = JSON.parse(raw);

  // Top-level shape
  if (!Array.isArray(data.stations)) err('Missing or non-array "stations"');
  if (!Array.isArray(data.places)) err('Missing or non-array "places"');
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

  const stations = data.stations;
  const places = data.places;

  // Station index
  const stationSlugs = new Set();
  for (const s of stations) {
    if (!s.slug) err(`Station missing slug: ${JSON.stringify(s)}`);
    if (!s.name) err(`Station missing name: ${JSON.stringify(s)}`);
    if (!s.line) err(`Station missing line: ${JSON.stringify(s)}`);
    if (s.slug && stationSlugs.has(s.slug)) err(`Duplicate station slug: ${s.slug}`);
    if (s.slug) stationSlugs.add(s.slug);

    if (s.coordinates) {
      const c = s.coordinates;
      if (typeof c.lat !== 'number') err(`Station "${s.name}": coordinates.lat is not a number`);
      else if (c.lat < LAT_MIN || c.lat > LAT_MAX) err(`Station "${s.name}": coordinates.lat ${c.lat} outside Klang Valley range [${LAT_MIN}, ${LAT_MAX}]`);
      if (typeof c.lng !== 'number') err(`Station "${s.name}": coordinates.lng is not a number`);
      else if (c.lng < LNG_MIN || c.lng > LNG_MAX) err(`Station "${s.name}": coordinates.lng ${c.lng} outside Klang Valley range [${LNG_MIN}, ${LNG_MAX}]`);
    }
  }

  // Place validation
  const placeSlugs = new Set();
  for (const p of places) {
    const label = p.name || p.slug || '(unknown place)';

    // slug
    if (!p.slug) err(`${label}: missing slug`);
    else {
      if (placeSlugs.has(p.slug)) err(`${label}: duplicate slug "${p.slug}"`);
      placeSlugs.add(p.slug);
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(p.slug) && p.slug.length > 1)
        err(`${label}: slug "${p.slug}" is not url-safe`);
      if (p.slug.length === 1 && !/^[a-z0-9]$/.test(p.slug))
        err(`${label}: slug "${p.slug}" is not url-safe`);
    }

    // name
    if (!p.name) err(`${label}: missing name`);

    // kind
    if (!VALID_KINDS.includes(p.kind)) err(`${label}: invalid kind "${p.kind}"`);

    // type
    if (!VALID_TYPES.includes(p.type)) err(`${label}: invalid type "${p.type}"`);

    // station
    if (!p.station) err(`${label}: missing station`);
    else if (p.station.includes(',')) err(`${label}: station contains comma (glued field): "${p.station}"`);
    else if (!stationSlugs.has(p.station)) err(`${label}: station "${p.station}" not in stations list`);

    // alsoNear
    if (Array.isArray(p.alsoNear)) {
      for (const an of p.alsoNear) {
        if (an.includes(',')) err(`${label}: alsoNear contains comma: "${an}"`);
        else if (!stationSlugs.has(an)) err(`${label}: alsoNear station "${an}" not in stations list`);
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
    if (p.source && !['owner', 'submitted'].includes(p.source))
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

  console.log(`✓ Valid: ${places.length} Places, ${stations.length} Stations checked.`);
} catch (e) {
  console.error(`Validation error: ${e.message}`);
  process.exit(1);
}
