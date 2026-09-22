import {
  buildPlace,
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
  placePullRequestBody,
  type AdminDeps,
} from "../../../lib/admin.ts";
import { json, type PagesContext } from "../../../lib/types.ts";

/**
 * The maintainer adds a Place: validate it, refuse a slug that already has a
 * Place, and open a pull request adding `data/places/<slug>.json`. Merging
 * publishes it on the next build.
 */
export async function onRequestPost(
  { request, env }: PagesContext,
  deps: AdminDeps = defaultAdminDeps,
): Promise<Response> {
  if (!githubReady(env)) return json({ error: NOT_CONNECTED }, 503);

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

  const build: PlaceBuild = buildPlace(draft, STATION_CODES, existingSlugs);
  if (!build.file || !build.slug) return json({ errors: build.errors }, 422);

  try {
    const prUrl = await deps.openPullRequest({
      repo: env.GITHUB_REPO,
      token: env.GITHUB_TOKEN,
      api: env.GITHUB_API,
      baseBranch: "main",
      branch: `place/${build.slug}`,
      files: [build.file],
      title: `Add place: ${build.place?.name ?? build.slug}`,
      body: placePullRequestBody(build, "Add"),
    });

    return json({ prUrl, slug: build.slug });
  } catch (error) {
    console.error("admin: could not open the place pull request", error);
    return json({ error: "Could not file that place for review." }, 502);
  }
}
