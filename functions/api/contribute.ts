import { lines } from "../../data/network.ts";
import {
  CONTRIBUTION_TYPES,
  buildContributionFile,
  contributionPullRequestBody,
  validateContribution,
  type ContributionDraft,
} from "../../app/lib/contribution.ts";
import { openContributionPullRequest } from "../lib/github.ts";
import { withinRateLimit } from "../lib/rate-limit.ts";
import {
  json,
  missingConfiguration,
  type PagesContext,
} from "../lib/types.ts";
import { verifyTurnstile } from "../lib/turnstile.ts";

const CONTRIBUTIONS_PER_HOUR = 5;

const STATION_NAMES = new Map<string, string>();
for (const line of lines) {
  for (const station of line.stations) {
    STATION_NAMES.set(station.code, station.name);
  }
}

const STATION_CODES = [...STATION_NAMES.keys()];

/**
 * The collaborators the write path depends on, injected so the endpoint can be
 * exercised without a network. Cloudflare passes only the context, so the real
 * implementations are the default.
 */
export interface ContributeDeps {
  verifyChallenge: (
    secret: string,
    token: string,
    remoteIp?: string,
  ) => Promise<boolean>;
  withinLimit: typeof withinRateLimit;
  openPullRequest: typeof openContributionPullRequest;
}

const defaultDeps: ContributeDeps = {
  verifyChallenge: verifyTurnstile,
  withinLimit: withinRateLimit,
  openPullRequest: openContributionPullRequest,
};

/**
 * The one write path a Contribution takes. A bot challenge and a rate-limit
 * counter are checked before anything is written, then the payload is
 * validated, then one pull request adds `data/contributions/<id>.json`.
 */
export async function onRequestPost(
  { request, env }: PagesContext,
  deps: ContributeDeps = defaultDeps,
): Promise<Response> {
  const unconfigured = missingConfiguration(env);
  if (unconfigured) return json({ error: unconfigured }, 503);
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return json({ error: "The review queue is not connected yet." }, 503);
  }

  const source = request.headers.get("cf-connecting-ip") ?? "unknown";

  if (
    !(await deps.withinLimit(env.RATE_LIMIT, `contribute:${source}`, {
      limit: CONTRIBUTIONS_PER_HOUR,
      windowSeconds: 3600,
    }))
  ) {
    return json(
      { error: "Too many contributions from here. Try again later." },
      429,
    );
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const token =
    typeof payload.turnstileToken === "string" ? payload.turnstileToken : "";

  if (!(await deps.verifyChallenge(env.TURNSTILE_SECRET, token, source))) {
    return json(
      { error: "We could not confirm you are human. Reload the page and try again." },
      403,
    );
  }

  const draft: ContributionDraft = {
    name: string(payload.name),
    station: string(payload.station),
    type: string(payload.type),
    map: string(payload.map),
    note: string(payload.note),
    contributorName: string(payload.contributorName),
    contributorHref: string(payload.contributorHref),
  };

  const { errors, contribution } = validateContribution(
    draft,
    STATION_CODES,
    [...CONTRIBUTION_TYPES],
  );
  if (!contribution) return json({ errors }, 422);

  const id = `c-${crypto.randomUUID().slice(0, 8)}`;
  const stationName = STATION_NAMES.get(contribution.station) ?? contribution.station;

  try {
    const prUrl = await deps.openPullRequest({
      repo: env.GITHUB_REPO,
      token: env.GITHUB_TOKEN,
      api: env.GITHUB_API,
      baseBranch: "main",
      branch: `contribution/${id}`,
      files: [buildContributionFile(contribution, id)],
      title: `Contribution: ${contribution.name} near ${stationName}`,
      body: contributionPullRequestBody(contribution, id, stationName),
    });

    return json({ prUrl });
  } catch (error) {
    console.error("contribute: could not open the pull request", error);
    return json(
      { error: "We could not file your contribution for review. Please try again." },
      502,
    );
  }
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}
