import {
  buildPlaceFile,
  isPlaceSlug,
  placePath,
  validatePlace,
} from "../../../../app/lib/place.ts";
import {
  NOT_CONNECTED,
  STATION_CODES,
  defaultAdminDeps,
  draftFromPayload,
  githubReady,
  placePullRequestBody,
  type AdminDeps,
} from "../../../lib/admin.ts";
import { json, type PagesContext } from "../../../lib/types.ts";

/**
 * The maintainer edits an existing Place. The slug is fixed by the URL, so a
 * rename cannot move a published page; the write opens a pull request that
 * replaces `data/places/<slug>.json` when it merges.
 */
export async function onRequestPost(
  { params, request, env }: PagesContext,
  deps: AdminDeps = defaultAdminDeps,
): Promise<Response> {
  const slug = params?.slug ?? "";
  if (!isPlaceSlug(slug)) return json({ error: "Unknown place." }, 404);
  if (!githubReady(env)) return json({ error: NOT_CONNECTED }, 503);

  try {
    const existing = await deps.readFile({
      repo: env.GITHUB_REPO,
      token: env.GITHUB_TOKEN,
      api: env.GITHUB_API,
      path: placePath(slug),
      ref: "main",
    });
    if (existing === null) return json({ error: "Unknown place." }, 404);
  } catch (error) {
    console.error("admin: could not read the place", error);
    return json({ error: "Could not read that place." }, 502);
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const draft = draftFromPayload(payload);
  const { errors, place } = validatePlace(draft, STATION_CODES);
  if (!place) return json({ errors }, 422);

  const file = buildPlaceFile(place, slug);

  try {
    const prUrl = await deps.openPullRequest({
      repo: env.GITHUB_REPO,
      token: env.GITHUB_TOKEN,
      api: env.GITHUB_API,
      baseBranch: "main",
      branch: `place/${slug}-edit`,
      files: [file],
      title: `Edit place: ${place.name}`,
      body: placePullRequestBody({ errors, place, slug, file }, "Edit"),
    });

    return json({ prUrl, slug });
  } catch (error) {
    console.error("admin: could not open the place pull request", error);
    return json({ error: "Could not file that edit for review." }, 502);
  }
}
