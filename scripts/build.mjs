#!/usr/bin/env node
/**
 * Build the site: prerender every route, then generate the preview cards.
 *
 * React Router's prerender step intermittently fails one route's internal request
 * ("Prerender: Request failed for /places/<slug>.data") — a different route each
 * time, and it has passed on retry on every occasion observed here (roughly one
 * run in three). A failed Pages build for a flake would be worse than a retry, so
 * the prerender gets a bounded number of attempts and then fails loudly.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const bin = (name) =>
  fileURLToPath(new URL(`../node_modules/.bin/${name}`, import.meta.url));

const MAX_ATTEMPTS = 3;

let built = false;
for (let attempt = 1; attempt <= MAX_ATTEMPTS && !built; attempt++) {
  const result = spawnSync(bin("react-router"), ["build"], { stdio: "inherit" });
  built = result.status === 0;
  if (!built) {
    if (attempt < MAX_ATTEMPTS) {
      console.log(
        `\n[build] react-router build failed (attempt ${attempt} of ${MAX_ATTEMPTS}) — retrying.\n`,
      );
    } else {
      console.error(`\n[build] react-router build failed ${MAX_ATTEMPTS} times — giving up.\n`);
    }
  }
}
process.exit(built ? runCards() : 1);

function runCards() {
  const cards = spawnSync(bin("tsx"), ["scripts/generate-og-cards.ts"], { stdio: "inherit" });
  return cards.status ?? 1;
}
