import propertiesData from "../../data/properties.json";

const SITE_URL = "https://naiktrainjer.com";

/**
 * The single source of truth for every static route the site builds.
 *
 * `react-router.config.ts`'s prerender() and the sitemap both read this list,
 * so a page cannot be built without appearing in the sitemap, or listed in the
 * sitemap without being built.
 *
 * To add the Submit page when #9 lands, add "/submit" to STATIC_ROUTES.
 */
export const STATIC_ROUTES = [
  "/",
  "/submit",
  ...propertiesData.places.map((place) => `/places/${place.slug}`),
] as const;

export { SITE_URL };

export function sitemapUrls(): string[] {
  return STATIC_ROUTES.map((path) => `${SITE_URL}${path}`);
}
