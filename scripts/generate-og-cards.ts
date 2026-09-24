import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { TYPE_LABELS } from "../app/lib/labels.ts";
import { stationNamesByCode } from "../app/lib/lines.ts";
import { firstStation } from "../app/lib/contribution.ts";
import { lines, places } from "../app/data/directory.node.ts";

const outDir = resolve(import.meta.dirname, "../build/client/og");

const stationMap = stationNamesByCode(lines);

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function badgeWidth(text: string): number {
  return Math.round(text.length * 10 + 24);
}

function buildSvg(place: (typeof places)[number]): string {
  const stationCode = firstStation(place.connections);
  const stationName = stationMap.get(stationCode) ?? stationCode;
  const typeLabel = TYPE_LABELS[place.type] ?? place.type;
  const isArea = place.kind === "area";
  const badge = isArea ? "Area" : typeLabel;

  const nameFontSize = place.name.length > 28 ? 40 : place.name.length > 20 ? 48 : 56;

  const bw = badgeWidth(badge);
  const badgeX = 120;
  const badgeCx = badgeX + bw / 2;

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#f8fafc"/>
  <rect x="80" y="80" width="1040" height="470" rx="24" fill="white" stroke="#e2e8f0" stroke-width="1"/>

  <text x="120" y="155" font-size="14" font-weight="600" fill="#94a3b8" letter-spacing="2" font-family="Inter, -apple-system, sans-serif">PLACE</text>

  <text x="120" y="${220}" font-size="${nameFontSize}" font-weight="800" fill="#0f172a" font-family="Inter, -apple-system, sans-serif">${escapeXml(place.name)}</text>

  <rect x="${badgeX}" y="252" width="${bw}" height="36" rx="8" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1"/>
  <text x="${badgeCx}" y="276" font-size="14" font-weight="600" fill="#0369a1" text-anchor="middle" font-family="Inter, -apple-system, sans-serif">${escapeXml(badge)}</text>

  <line x1="120" y1="320" x2="1080" y2="320" stroke="#e2e8f0" stroke-width="1"/>

  <text x="120" y="365" font-size="13" font-weight="600" fill="#94a3b8" letter-spacing="2" font-family="Inter, -apple-system, sans-serif">NEAREST STATION</text>
  <text x="120" y="405" font-size="28" font-weight="700" fill="#0f172a" font-family="Inter, -apple-system, sans-serif">${escapeXml(stationName)}</text>

  <line x1="120" y1="445" x2="1080" y2="445" stroke="#e2e8f0" stroke-width="1"/>

  <text x="120" y="490" font-size="20" font-weight="700" fill="#0f172a" font-family="Inter, -apple-system, sans-serif">NaikTrainJer</text>
  <text x="120" y="515" font-size="13" font-weight="400" fill="#64748b" font-family="Inter, -apple-system, sans-serif">naiktrainjer.com</text>
</svg>`;
}

async function main() {
  mkdirSync(outDir, { recursive: true });

  let count = 0;
  for (const place of places) {
    const svg = buildSvg(place);
    const outPath = resolve(outDir, `${place.slug}.png`);
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    count++;
  }
  console.log(`Generated ${count} OG cards in ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
