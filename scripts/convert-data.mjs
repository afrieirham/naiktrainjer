import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

/**
 * One-off migration: turns the maintainer's Notion export at `new/data.csv` into
 * `data/properties.json`, the single source of truth for every Place.
 *
 * It has already been run, and the CSV it read has been deleted — this script is kept
 * for provenance, not for the build. It is not part of `npm run build` or the test
 * suite, and nothing else in the repo reads the CSV. To re-run it, restore the source
 * first: `git show <commit>:new/data.csv > new/data.csv`.
 *
 * It resolves each Place's coordinates by following its Google Maps short link and
 * reading the position out of the redirect target, so re-running it needs network
 * access and will overwrite `data/properties.json`.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── CSV parser (handles quoted fields with commas, BOM, \r) ─────────────────
function parseCSV(text) {
  // strip BOM and normalize line endings
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = clean.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
    return row;
  });
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

// ── Slugify ─────────────────────────────────────────────────────────────────
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Station name corrections ────────────────────────────────────────────────
const STATION_FIXES = {
  'LRT Abdulah Hukum': 'LRT Abdullah Hukum',
};

function fixStation(name) {
  return STATION_FIXES[name] || name;
}

// ── Type normalisation ──────────────────────────────────────────────────────
const VALID_TYPES = [
  'condominium', 'service-apartment', 'apartment', 'flat',
  'terrace', 'shop-office', 'area',
];

function normaliseType(raw) {
  if (!raw) return { kind: 'building', type: 'condominium' }; // blank → infer condominium
  const lower = raw.toLowerCase().replace(/\s+/g, '-');
  if (lower === 'shop/office') return { kind: 'building', type: 'shop-office' };
  if (lower === 'service-apartment' || lower === 'service apartment') {
    return { kind: 'building', type: 'service-apartment' };
  }
  if (lower === 'area') return { kind: 'area', type: 'area' };
  if (VALID_TYPES.includes(lower)) return { kind: 'building', type: lower };
  throw new Error(`Unknown type: ${raw}`);
}

// ── Coordinate resolver (follows Google Maps redirects, no API key) ─────────
function resolveCoords(url) {
  if (!url) return Promise.resolve(null);
  return new Promise((res) => {
    const timer = setTimeout(() => res(null), 15000);
    const follow = (u) => {
      const mod = u.startsWith('https') ? https : http;
      mod.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          follow(r.headers.location);
        } else {
          clearTimeout(timer);
          const effective = r.url || u;
          // Try @lat,lng first (more reliable)
          let m = effective.match(/@([-\d.]+),([-\d.]+)/);
          if (m) { res({ lat: parseFloat(m[1]), lng: parseFloat(m[2]) }); return; }
          // Then try !3dlat!4dlng
          m = effective.match(/!3d([-\d.]+)!4d([-\d.]+)/);
          if (m) { res({ lat: parseFloat(m[1]), lng: parseFloat(m[2]) }); return; }
          res(null);
        }
      }).on('error', () => { clearTimeout(timer); res(null); });
    };
    follow(url);
  });
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const csvText = readFileSync(resolve(root, 'new/data.csv'), 'utf-8');
  const rows = parseCSV(csvText);
  console.log(`Read ${rows.length} rows from CSV`);

  // 1. Collect and normalise stations
  const stationMap = new Map(); // name → { slug, name, line }
  for (const row of rows) {
    const raw = fixStation(row.Station);
    const parts = raw.split(',').map(s => s.trim());
    for (const s of parts) {
      if (!stationMap.has(s)) {
        stationMap.set(s, { slug: slugify(s), name: s, line: 'kelana-jaya' });
      }
    }
  }
  console.log(`Found ${stationMap.size} unique stations`);

  // 2. Build places
  const slugCounters = {};
  const places = [];

  for (const row of rows) {
    const name = row.Name;
    const { kind, type } = normaliseType(row.Type);

    // Station handling
    const rawStation = fixStation(row.Station);
    const parts = rawStation.split(',').map(s => s.trim());
    const mainStationName = parts[0];
    const alsoNearNames = parts.slice(1);

    if (parts.length > 1) {
      console.log(`  Multi-station: ${name} → station=${mainStationName}, alsoNear=${alsoNearNames.join(', ')}`);
    }

    const stationSlug = stationMap.get(mainStationName).slug;
    const alsoNear = alsoNearNames.map(n => stationMap.get(n).slug);

    // Slug
    let slug = slugify(name);
    if (slugCounters[slug]) {
      slugCounters[slug]++;
      slug = `${slug}-${slugCounters[slug]}`;
    } else {
      slugCounters[slug] = 1;
    }

    // Map link
    const map = row['Google Map'] || undefined;

    // Coordinates
    let coordinates = null;
    if (map) {
      coordinates = await resolveCoords(map);
      if (coordinates) {
        console.log(`  Coords ${name}: ${coordinates.lat}, ${coordinates.lng}`);
      } else {
        console.log(`  Coords ${name}: FAILED`);
      }
    }

    const place = {
      slug,
      name,
      kind,
      type,
      station: stationSlug,
      alsoNear,
    };
    if (map) place.map = map;
    if (coordinates) place.coordinates = coordinates;
    place.source = 'owner';

    places.push(place);
  }

  // 3. Write output
  mkdirSync(resolve(root, 'data'), { recursive: true });
  const data = { stations: [...stationMap.values()], places };
  const outPath = resolve(root, 'data/properties.json');
  writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`\nWrote ${places.length} places and ${stationMap.size} stations to data/properties.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
