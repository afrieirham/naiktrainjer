import {
  contributionBranch,
  contributionPath,
  isContributionId,
  type ValidatedContribution,
} from "../../../../app/lib/contribution.ts";
import {
  contributionToDraft,
  contributionToPlace,
  deriveSlug,
  placePath,
  type PlaceBuild,
} from "../../../../app/lib/place.ts";
import {
  NOT_CONNECTED,
  STATION_CODES,
  defaultAdminDeps,
  draftFromPayload,
  githubReady,
  type AdminDeps,
} from "../../../lib/admin.ts";
import { json, type PagesContext } from "../../../lib/types.ts";

/**
 * The read the approve page loads first: the pending Contribution, straight from
 * the branch its pull request owns. It is never read from `main`, because a
 * Contribution never merges there.
 */
export async function onRequestGet(
  { params, env }: PagesContext,
  deps: AdminDeps = defaultAdminDeps,
): Promise<Response> {
  const id = params?.id ?? "";
  if (!isContributionId(id)) return json({ error: "Unknown contribution." }, 404);
  if (!githubReady(env)) return json({ error: NOT_CONNECTED }, 503);

  try {
    const contents = await deps.readFile({
      repo: env.GITHUB_REPO,
      token: env.GITHUB_TOKEN,
      api: env.GITHUB_API,
      path: contributionPath(id),
      ref: contributionBranch(id),
    });

    if (contents === null) {
      return json({ error: "That contribution is not on its branch." }, 404);
    }

    const contribution = JSON.parse(contents) as ValidatedContribution;
    return json({
      id,
      branch: contributionBranch(id),
      contribution,
      draft: contributionToDraft(contribution),
    });
  } catch (error) {
    console.error("admin: could not read the contribution", error);
    return json({ error: "Could not read that contribution." }, 502);
  }
}

/**
 * Approve: validate the finished Place, add it to the Contribution's own branch,
 * then delete the Contribution from that branch. The pull request is left open
 * for the maintainer to merge, and merging publishes on the next build.
 */
export async function onRequestPost(
  { params, request, env }: PagesContext,
  deps: AdminDeps = defaultAdminDeps,
): Promise<Response> {
  const id = params?.id ?? "";
  if (!isContributionId(id)) return json({ error: "Unknown contribution." }, 404);
  if (!githubReady(env)) return json({ error: NOT_CONNECTED }, 503);

  let contribution: ValidatedContribution;
  try {
    const contents = await deps.readFile({
      repo: env.GITHUB_REPO,
      token: env.GITHUB_TOKEN,
      api: env.GITHUB_API,
      path: contributionPath(id),
      ref: contributionBranch(id),
    });
    if (contents === null) {
      return json({ error: "That contribution is not on its branch." }, 404);
    }
    contribution = JSON.parse(contents) as ValidatedContribution;
  } catch (error) {
    console.error("admin: could not read the contribution", error);
    return json({ error: "Could not read that contribution." }, 502);
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const draft = draftFromPayload(payload);

  let existingSlugs: string[] = [];
  try {
    const slug = deriveSlug(draft.name);
    if (slug) {
      const existing = await deps.readFile({
        repo: env.GITHUB_REPO,
        token: env.GITHUB_TOKEN,
        api: env.GITHUB_API,
        path: placePath(slug),
        ref: "main",
      });
      if (existing !== null) existingSlugs = [slug];
    }
  } catch (error) {
    console.error("admin: could not check for an existing place", error);
    return json({ error: "Could not check the directory for that place." }, 502);
  }

  const build: PlaceBuild = contributionToPlace(
    contribution,
    draft,
    STATION_CODES,
    existingSlugs,
  );
  if (!build.file || !build.slug) return json({ errors: build.errors }, 422);

  const branch = contributionBranch(id);
  try {
    // The Place lands first, then the Contribution goes: the branch is never
    // left holding a Contribution with no Place beside it.
    await deps.putFile({
      repo: env.GITHUB_REPO,
      token: env.GITHUB_TOKEN,
      api: env.GITHUB_API,
      branch,
      path: build.file.path,
      contents: build.file.contents,
      message: `Approve ${build.file.path}`,
    });
    await deps.deleteFile({
      repo: env.GITHUB_REPO,
      token: env.GITHUB_TOKEN,
      api: env.GITHUB_API,
      branch,
      path: contributionPath(id),
      message: `Remove ${contributionPath(id)}`,
    });

    return json({ branch, slug: build.slug });
  } catch (error) {
    console.error("admin: could not approve the contribution", error);
    return json({ error: "Could not approve that contribution." }, 502);
  }
}
