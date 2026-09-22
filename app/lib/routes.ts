import { places } from "../data/directory";

const SITE_URL = "https://naiktrainjer.com";

/**
 * The single source of truth for every static route the site builds.
 *
 * `react-router.config.ts`'s prerender() and the sitemap both read this list,
 * so a page cannot be built without appearing in the sitemap, or listed in the
 * sitemap without being built.
 */
export const STATIC_ROUTES = [
  "/",
  "/contribute",
  "/contributors",
  ...places.map((place) => `/places/${place.slug}`),
] as const;

export { SITE_URL };

/**
 * The URL a visitor actually lands on. Cloudflare Pages serves a directory
 * build as `/places/x/` and permanently redirects the slashless form, so the
 * sitemap and every canonical tag must name the trailing-slash version —
 * otherwise the site tells crawlers to index a URL that redirects.
 */
export function publicUrl(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}/`;
}

export function sitemapUrls(): string[] {
  return STATIC_ROUTES.map(publicUrl);
}
