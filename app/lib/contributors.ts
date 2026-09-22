import type { Place } from "./browse-filter";

/** The person a Place credits: a self-supplied name and an optional link. */
export type Contributor = {
  name: string;
  href: string | null;
};

/** One Contributor, with every Place the directory credits to them. */
export type ContributorCredit = {
  name: string;
  href: string | null;
  places: Place[];
};

/**
 * The Contributor a Place credits, or nobody.
 *
 * Only a `contributed` Place credits anyone: an `owner` Place was researched by
 * hand and credits nobody, even if a Contributor record lingers on it.
 */
export function placeContributor(place: Place): Contributor | null {
  if (place.source !== "contributed") return null;
  return place.contributor ?? null;
}

/**
 * Every Contributor the directory credits, each with the Places they contributed.
 *
 * A Contributor is identified by their name together with their link, so the same
 * display name with and without a link is two people, and the same name on two
 * links is two people. Only a contributed Place with a Contributor is credited.
 *
 * Sorted by name, then link, then Place name, so the page is deterministic.
 */
export function creditedContributors(places: Place[]): ContributorCredit[] {
  const credits = new Map<string, ContributorCredit>();

  for (const place of places) {
    const contributor = placeContributor(place);
    if (!contributor) continue;

    const key = `${contributor.name}\u0000${contributor.href ?? ""}`;
    const credit = credits.get(key) ?? {
      name: contributor.name,
      href: contributor.href,
      places: [],
    };

    credit.places.push(place);
    credits.set(key, credit);
  }

  return [...credits.values()]
    .map((credit) => ({
      ...credit,
      places: [...credit.places].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    }))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) ||
        (left.href ?? "").localeCompare(right.href ?? ""),
    );
}
