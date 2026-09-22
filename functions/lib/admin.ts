import networkData from "../../data/network.json" with { type: "json" };
import {
  EMPTY_PLACE_DRAFT,
  type PlaceBuild,
  type PlaceDraft,
} from "../../app/lib/place.ts";
import {
  deleteGithubFile,
  openContributionPullRequest,
  putGithubFile,
  readGithubFile,
  type ContributionPullRequest,
  type GithubDelete,
  type GithubRead,
  type GithubWrite,
} from "./github.ts";
import type { Env } from "./types.ts";

/**
 * The collaborators an admin write depends on, injected so the handlers can be
 * exercised without a network. Cloudflare passes only the context, so the real
 * implementations are the default.
 */
export interface AdminDeps {
  readFile: (input: GithubRead) => Promise<string | null>;
  putFile: (input: GithubWrite) => Promise<void>;
  deleteFile: (input: GithubDelete) => Promise<void>;
  openPullRequest: (input: ContributionPullRequest) => Promise<string>;
}

export const defaultAdminDeps: AdminDeps = {
  readFile: readGithubFile,
  putFile: putGithubFile,
  deleteFile: deleteGithubFile,
  openPullRequest: openContributionPullRequest,
};

/** Every Station on the network, by code, from the same reference the public form uses. */
export const STATION_CODES: string[] = networkData.lines.flatMap(
  (line: { stations: { code: string }[] }) =>
    line.stations.map((station) => station.code),
);

/** The admin write path needs only the repository credentials. */
export function githubReady(env: Env): boolean {
  return Boolean(env.GITHUB_TOKEN && env.GITHUB_REPO);
}

export const NOT_CONNECTED =
  "The repository connection is not configured yet.";

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Read the approve or place form's payload into a Place draft. The Also near
 * field arrives as a list of codes from the page; anything else is read as a
 * comma- or whitespace-separated string.
 */
export function draftFromPayload(payload: Record<string, unknown>): PlaceDraft {
  const alsoNear = Array.isArray(payload.alsoNear)
    ? payload.alsoNear.map((code) => string(code)).join(", ")
    : string(payload.alsoNear);

  return {
    ...EMPTY_PLACE_DRAFT,
    name: string(payload.name),
    kind: string(payload.kind),
    type: string(payload.type),
    station: string(payload.station),
    alsoNear,
    map: string(payload.map),
    lat: string(payload.lat),
    lng: string(payload.lng),
    source: string(payload.source) || EMPTY_PLACE_DRAFT.source,
    contributorName: string(payload.contributorName),
    contributorHref: string(payload.contributorHref),
  };
}

/** The body of a Place pull request, the maintainer's own review note. */
export function placePullRequestBody(build: PlaceBuild, verb: string): string {
  const place = build.place;
  return [
    `${verb} \`${build.file?.path}\`.`,
    "",
    "A Place is published when this pull request merges and the next build runs.",
    "",
    `- Name: ${place?.name ?? "(unknown)"}`,
    `- Kind: ${place?.kind ?? "(unknown)"}`,
    `- Type: ${place?.type ?? "(unknown)"}`,
    `- Station: ${place?.station ?? "(unknown)"}`,
    `- Source: ${place?.source ?? "(unknown)"}`,
    `- Contributor: ${place?.contributor?.name ?? "none"}`,
  ].join("\n");
}
