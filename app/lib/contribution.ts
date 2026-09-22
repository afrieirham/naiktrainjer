/**
 * The rules of a Contribution, kept apart from the Function that files it.
 *
 * A Contribution is a visitor's proposed Place: a name and a Station are the
 * only facts required, and everything else is optional detail. It is never a
 * Place and is never rendered — approving it is what turns it into one.
 *
 * This module has no imports and touches no runtime, so the browser, the
 * Pages Function and the tests all read the same rules.
 */

/** The controlled list of Type, matching the Place records. */
export const CONTRIBUTION_TYPES = [
  "condominium",
  "service-apartment",
  "apartment",
  "flat",
  "terrace",
  "shop-office",
  "area",
] as const;

export const CONTRIBUTIONS_DIR = "data/contributions";
export const MAX_NAME = 120;
export const MAX_NOTE = 280;
export const MAX_CONTRIBUTOR_NAME = 60;

/** What the visitor typed, before any of it is trusted. */
export interface ContributionDraft {
  name: string;
  station: string;
  type: string;
  map: string;
  note: string;
  contributorName: string;
  contributorHref: string;
}

/** The Contribution once every rule has passed: the shape of the record. */
export interface ValidatedContribution {
  name: string;
  station: string;
  type: string | null;
  map: string | null;
  note: string | null;
  contributor: { name: string; href: string | null } | null;
}

export interface ContributionFile {
  path: string;
  contents: string;
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function isWebAddress(value: string): boolean {
  let parsed: URL | null;
  try {
    parsed = new URL(value);
  } catch {
    parsed = null;
  }
  return (
    parsed !== null &&
    (parsed.protocol === "http:" || parsed.protocol === "https:")
  );
}

/**
 * The rules that apply to what the visitor typed. Exported on its own so the
 * browser can check the form before it spends a bot-challenge token, while the
 * endpoint checks the same rules again.
 */
export function validateFields(
  draft: ContributionDraft,
  knownStations: string[],
  knownTypes: string[] = [...CONTRIBUTION_TYPES],
): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = draft.name.trim();
  if (name.length === 0) errors.name = "Give the place a name.";
  else if (name.length > MAX_NAME) {
    errors.name = `Keep the name under ${MAX_NAME} characters.`;
  }

  const station = draft.station.trim();
  if (station.length === 0) {
    errors.station = "Choose the station this place is near.";
  } else if (!knownStations.includes(station)) {
    errors.station = "That is not a station on the network.";
  }

  const type = draft.type.trim();
  if (type.length > 0 && !knownTypes.includes(type)) {
    errors.type = "That is not a type in the directory.";
  }

  const map = draft.map.trim();
  if (map.length > 0 && !isWebAddress(map)) {
    errors.map = "That link does not look like a web address.";
  }

  const href = draft.contributorHref.trim();
  if (href.length > 0 && !isWebAddress(href)) {
    errors.contributorHref = "That link does not look like a web address.";
  }

  const note = draft.note.trim();
  if (note.length > MAX_NOTE) {
    errors.note = `Keep the note under ${MAX_NOTE} characters.`;
  }

  const contributorName = draft.contributorName.trim();
  if (contributorName.length > MAX_CONTRIBUTOR_NAME) {
    errors.contributorName = `Keep your name under ${MAX_CONTRIBUTOR_NAME} characters.`;
  }

  return errors;
}

/**
 * Validate the draft and, when it is clean, build the Contribution. A blank
 * contributor becomes nobody rather than an empty person.
 */
export function validateContribution(
  draft: ContributionDraft,
  knownStations: string[],
  knownTypes: string[] = [...CONTRIBUTION_TYPES],
): {
  errors: Record<string, string>;
  contribution: ValidatedContribution | null;
} {
  const errors = validateFields(draft, knownStations, knownTypes);
  if (Object.keys(errors).length > 0) return { errors, contribution: null };

  const contributorName = optional(draft.contributorName);
  const contributorHref = optional(draft.contributorHref);

  return {
    errors,
    contribution: {
      name: draft.name.trim(),
      station: draft.station.trim(),
      type: optional(draft.type),
      map: optional(draft.map),
      note: optional(draft.note),
      contributor:
        contributorName === null
          ? null
          : { name: contributorName, href: contributorHref },
    },
  };
}

/**
 * The one file a Contribution adds: `data/contributions/<id>.json`. It is
 * written only on a pull-request branch and is never merged into `main`.
 */
export function buildContributionFile(
  contribution: ValidatedContribution,
  id: string,
): ContributionFile {
  return {
    path: `${CONTRIBUTIONS_DIR}/${id}.json`,
    contents: `${JSON.stringify({ id, ...contribution }, null, 2)}\n`,
  };
}

/**
 * The pull request is the review screen, so its body names the place, the
 * Station and the Contribution itself.
 */
export function contributionPullRequestBody(
  contribution: ValidatedContribution,
  id: string,
  stationName: string,
): string {
  const contributor = contribution.contributor
    ? `${contribution.contributor.name}${
        contribution.contributor.href ? ` (${contribution.contributor.href})` : ""
      }`
    : "anonymous";

  const lines = [
    `Contribution \`${id}\`: **${contribution.name}** near **${stationName}** (${contribution.station}).`,
    "",
    "A Contribution is a proposal, not a Place. It is never rendered until it is approved.",
    "",
    `- Type: ${contribution.type ?? "not given"}`,
    `- Map: ${contribution.map ?? "not given"}`,
    `- Contributor: ${contributor}`,
  ];

  if (contribution.note) lines.push("", `> ${contribution.note}`);

  lines.push("", "Review the Contribution, then approve it into a Place.");
  return lines.join("\n");
}
