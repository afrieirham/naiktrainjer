/**
 * The rules of a Contribution, kept apart from the Function that files it.
 *
 * A Contribution is a visitor's proposed Place: a name and one or more
 * Connections are the only facts required, and everything else is optional
 * detail. It is never a Place and is never rendered — approving it is what turns
 * it into one.
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

/**
 * A Station a Place is near, with the optional hand-pasted Route frame for that
 * Place→Station pair. The frame is stored whole, never calculated; a Connection
 * without one is still a valid Connection.
 */
export interface Connection {
  station: string;
  embed: string | null;
}

/** A Connection as a form or a payload carries it, before any of it is trusted. */
export interface ConnectionDraft {
  station: string;
  embed: string;
}

/** The blank Connection a form starts its editor from. */
export const EMPTY_CONNECTION_DRAFT: ConnectionDraft = { station: "", embed: "" };

/** A Contribution's id as the write path mints it: safe to use in a ref and a path. */
export function isContributionId(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
}

/** The file a Contribution lives in, on its pull-request branch. */
export function contributionPath(id: string): string {
  return `${CONTRIBUTIONS_DIR}/${id}.json`;
}

/** The one branch a Contribution owns, from filing through approval. */
export function contributionBranch(id: string): string {
  return `contribution/${id}`;
}

/** What the visitor typed, before any of it is trusted. */
export interface ContributionDraft {
  name: string;
  connections: ConnectionDraft[];
  type: string;
  map: string;
  note: string;
  contributorName: string;
  contributorHref: string;
}

/** The Contribution once every rule has passed: the shape of the record. */
export interface ValidatedContribution {
  name: string;
  connections: Connection[];
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

export function isWebAddress(value: string): boolean {
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

/** The Google Maps hosts a Route frame's embed may live on. */
const GOOGLE_MAPS_EMBED_HOSTS = ["google.com", "www.google.com", "maps.google.com"];

/**
 * A Google Maps embed link: the only address a Route frame may hold. The embed
 * path is what a pasted walking route opens as; a share link (`maps.app.goo.gl`)
 * or a directions link (`/maps/dir`) is refused, so no other Google Maps page
 * can masquerade as a Route frame.
 */
export function isGoogleMapsEmbed(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (!GOOGLE_MAPS_EMBED_HOSTS.includes(parsed.hostname)) return false;
  if (parsed.pathname !== "/maps/embed") return false;
  return parsed.searchParams.has("pb");
}

/** The `src` of a pasted `<iframe>` tag, or null when the paste is not one. */
function iframeSrc(value: string): string | null {
  const match = value.match(
    /<iframe\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
  );
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
}

/** The entity an iframe's `src` carries, back to the character it stands for. */
function decodeHtmlEntities(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&#38;/g, "&");
}

/** The walking form of an embed link: its mode segment is always `!3e2`. */
function walkRouteFrame(value: string): string {
  return value.replace(/!3e\d/g, "!3e2");
}

/**
 * The Route frame a paste becomes. A whole `<iframe>` tag is unwrapped to its
 * `src`; a bare Google Maps embed URL is kept. The result is stored as the
 * walking route (`!3e2`), matching ADR-0006: one link, walked and driven. Any
 * other link is returned as pasted, for `isGoogleMapsEmbed` to refuse. Null when
 * nothing was pasted.
 */
export function normalizeRouteFrame(value: string): string | null {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) return null;

  const src = iframeSrc(trimmed);
  const url = decodeHtmlEntities(src ?? trimmed).trim();
  if (url.length === 0) return null;

  return isGoogleMapsEmbed(url) ? walkRouteFrame(url) : url;
}

/**
 * The Connections a set of drafts carries, with the blanks dropped. A row whose
 * Station and Route frame are both blank is an editor's spare line, not a
 * Connection. The Route frame is normalised here, at the boundary where a draft
 * becomes a record, so the stored link is always the bare walking embed.
 */
export function toConnections(connections: ConnectionDraft[]): Connection[] {
  return (connections ?? [])
    .filter(
      (connection) =>
        (connection.station ?? "").trim().length > 0 ||
        (connection.embed ?? "").trim().length > 0,
    )
    .map((connection) => ({
      station: (connection.station ?? "").trim(),
      embed: normalizeRouteFrame(connection.embed ?? ""),
    }));
}

/**
 * One Connection as it is written to a record: a null Route frame is left off,
 * so the stored shape is the same before and after approval.
 */
export function connectionRecord(connection: Connection): Record<string, string> {
  const record: Record<string, string> = { station: connection.station };
  if (connection.embed) record.embed = connection.embed;
  return record;
}

/** The Station a Place is nearest: the first of its Connections. */
export function firstStation(connections: { station: string }[]): string {
  return connections[0]?.station ?? "";
}

/** The Connection drafts a stored Connection list becomes on a form. */
export function connectionDraftsFromConnections(
  connections: Connection[],
): ConnectionDraft[] {
  const drafts = connections.map((connection) => ({
    station: connection.station,
    embed: connection.embed ?? "",
  }));
  return drafts.length > 0 ? drafts : [{ ...EMPTY_CONNECTION_DRAFT }];
}

/** The Connection drafts an untrusted payload carries. */
export function connectionDraftsFromPayload(value: unknown): ConnectionDraft[] {
  if (!Array.isArray(value)) return [{ ...EMPTY_CONNECTION_DRAFT }];
  const drafts = value.map((entry) => {
    const connection = (entry ?? {}) as Record<string, unknown>;
    return {
      station: typeof connection.station === "string" ? connection.station : "",
      embed: typeof connection.embed === "string" ? connection.embed : "",
    };
  });
  return drafts.length > 0 ? drafts : [{ ...EMPTY_CONNECTION_DRAFT }];
}

/**
 * The rules that apply to a Connection list. Exported so the Place rules and
 * the Contribution rules agree: a draft both accept is a record both accept.
 */
export function validateConnections(
  connections: ConnectionDraft[],
  knownStations: string[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  const rows = toConnections(connections ?? []);

  if (rows.length === 0) {
    errors.connections = "Choose at least one station this place is near.";
    return errors;
  }

  for (const connection of rows) {
    if (connection.station.length === 0) {
      errors.connections = "Every connection needs a station.";
      break;
    }
    if (!knownStations.includes(connection.station)) {
      errors.connections = `"${connection.station}" is not a station on the network.`;
      break;
    }
    if (connection.embed !== null) {
      if (!isWebAddress(connection.embed)) {
        errors.connections = "That Route frame is not a web address.";
      } else if (!isGoogleMapsEmbed(connection.embed)) {
        errors.connections = "That Route frame is not a Google Maps embed link.";
      }
      if (errors.connections) break;
    }
  }

  return errors;
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

  Object.assign(
    errors,
    validateConnections(draft.connections, knownStations),
  );

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
      connections: toConnections(draft.connections),
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
    path: contributionPath(id),
    contents: `${JSON.stringify(
      {
        id,
        ...contribution,
        connections: contribution.connections.map(connectionRecord),
      },
      null,
      2,
    )}\n`,
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

  const stationCodes = contribution.connections
    .map((connection) => connection.station)
    .join(", ");

  const lines = [
    `Contribution \`${id}\`: **${contribution.name}** near **${stationName}** (${stationCodes}).`,
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
