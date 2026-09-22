/**
 * The rules of a Place, kept apart from the Function that commits one.
 *
 * A Place is a finished directory record: it has a Station and a slug of its
 * own, and it is what a Contribution becomes when the maintainer approves it.
 * Nothing here touches a runtime, so the browser, the Pages Function, the
 * scripts and the tests all read the same rules.
 *
 * The coordinate bounds and the controlled lists mirror `scripts/validate-data.mjs`:
 * a Place this module accepts must be one the data validator accepts, or a bad
 * Place could reach `main`.
 */
import {
  CONTRIBUTION_TYPES,
  MAX_CONTRIBUTOR_NAME,
  MAX_NAME,
  isWebAddress,
  type ValidatedContribution,
} from "./contribution.ts";

/** The two shapes a Place takes. */
export const PLACE_KINDS = ["building", "area"] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];

/** The controlled list of Type, the same list the public Contribute form offers. */
export const PLACE_TYPES = CONTRIBUTION_TYPES;

/** Where a Place came from. */
export const PLACE_SOURCES = ["owner", "contributed"] as const;
export type PlaceSource = (typeof PLACE_SOURCES)[number];

/** Klang Valley plausible bounds, matching the data validator. */
export const LAT_MIN = 2.9;
export const LAT_MAX = 3.3;
export const LNG_MIN = 101.4;
export const LNG_MAX = 101.8;

export const PLACES_DIR = "data/places";

/** What the maintainer typed into the Place form, before any of it is trusted. */
export interface PlaceDraft {
  name: string;
  kind: string;
  type: string;
  station: string;
  /** Station codes, separated by commas or whitespace. */
  alsoNear: string;
  map: string;
  /** Coordinates as the form's text inputs carry them. */
  lat: string;
  lng: string;
  source: string;
  contributorName: string;
  contributorHref: string;
}

/** A Place once every rule has passed: the shape of the record. */
export interface ValidatedPlace {
  name: string;
  kind: PlaceKind;
  type: string;
  station: string;
  alsoNear: string[];
  map: string | null;
  coordinates: { lat: number; lng: number } | null;
  source: PlaceSource;
  contributor: { name: string; href: string | null } | null;
}

export interface PlaceFile {
  path: string;
  contents: string;
}

export interface PlaceBuild {
  errors: Record<string, string>;
  slug: string | null;
  place: ValidatedPlace | null;
  file: PlaceFile | null;
}

export const EMPTY_PLACE_DRAFT: PlaceDraft = {
  name: "",
  kind: "",
  type: "",
  station: "",
  alsoNear: "",
  map: "",
  lat: "",
  lng: "",
  source: "owner",
  contributorName: "",
  contributorHref: "",
};

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Split an "Also near" field into network codes, dropping the empty pieces. */
export function parseStationCodes(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
}

function inBounds(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * The slug a Place is filed under: its name lowercased, with every run of
 * anything that is not a letter or a digit collapsed to a hyphen. Empty when the
 * name holds nothing a URL can be made from.
 */
export function deriveSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The one file a Place lives in, keyed by its slug. */
export function placePath(slug: string): string {
  return `${PLACES_DIR}/${slug}.json`;
}

/** A slug is URL-safe exactly when it is lower-case alphanumerics and hyphens. */
export function isPlaceSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value) || /^[a-z0-9]$/.test(value);
}

/**
 * The rules that apply to what the maintainer typed. Exported on its own so the
 * admin form can check before it submits, while the endpoint checks again.
 */
export function validatePlaceFields(
  draft: PlaceDraft,
  knownStations: string[],
): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = draft.name.trim();
  if (name.length === 0) errors.name = "Give the place a name.";
  else if (name.length > MAX_NAME) {
    errors.name = `Keep the name under ${MAX_NAME} characters.`;
  }

  const kind = draft.kind.trim();
  if (kind.length === 0) errors.kind = "Choose a kind: building or an area.";
  else if (!(PLACE_KINDS as readonly string[]).includes(kind)) {
    errors.kind = "That is not a kind in the directory.";
  }

  const type = draft.type.trim();
  if (type.length === 0) errors.type = "Choose the place's type.";
  else if (!(PLACE_TYPES as readonly string[]).includes(type)) {
    errors.type = "That is not a type in the directory.";
  }

  const station = draft.station.trim();
  if (station.length === 0) {
    errors.station = "Choose the station this place is near.";
  } else if (!knownStations.includes(station)) {
    errors.station = "That is not a station on the network.";
  }

  const alsoNear = parseStationCodes(draft.alsoNear);
  for (const code of alsoNear) {
    if (!knownStations.includes(code)) {
      errors.alsoNear = `"${code}" is not a station on the network.`;
      break;
    }
  }

  const map = draft.map.trim();
  if (map.length > 0 && !isWebAddress(map)) {
    errors.map = "That link does not look like a web address.";
  }

  const latRaw = draft.lat.trim();
  const lngRaw = draft.lng.trim();
  if (latRaw.length > 0 || lngRaw.length > 0) {
    const lat = Number(latRaw);
    if (latRaw.length === 0 || !Number.isFinite(lat)) {
      errors.lat = "Give the latitude as a number.";
    } else if (!inBounds(lat, LAT_MIN, LAT_MAX)) {
      errors.lat = `Latitude must be inside the Klang Valley (${LAT_MIN}–${LAT_MAX}).`;
    }

    const lng = Number(lngRaw);
    if (lngRaw.length === 0 || !Number.isFinite(lng)) {
      errors.lng = "Give the longitude as a number.";
    } else if (!inBounds(lng, LNG_MIN, LNG_MAX)) {
      errors.lng = `Longitude must be inside the Klang Valley (${LNG_MIN}–${LNG_MAX}).`;
    }
  }

  const source = draft.source.trim();
  if (!(PLACE_SOURCES as readonly string[]).includes(source)) {
    errors.source = "A place is either owner-researched or contributed.";
  }

  const contributorName = draft.contributorName.trim();
  if (contributorName.length > MAX_CONTRIBUTOR_NAME) {
    errors.contributorName = `Keep the Contributor's name under ${MAX_CONTRIBUTOR_NAME} characters.`;
  }

  const contributorHref = draft.contributorHref.trim();
  if (contributorHref.length > 0 && !isWebAddress(contributorHref)) {
    errors.contributorHref = "That link does not look like a web address.";
  }

  return errors;
}

/** Build the Place record from a draft that has already passed the rules. */
export function placeFromDraft(draft: PlaceDraft): ValidatedPlace {
  const latRaw = draft.lat.trim();
  const lngRaw = draft.lng.trim();
  const contributorName = optional(draft.contributorName);
  const contributorHref = optional(draft.contributorHref);

  return {
    name: draft.name.trim(),
    kind: draft.kind.trim() as PlaceKind,
    type: draft.type.trim(),
    station: draft.station.trim(),
    alsoNear: parseStationCodes(draft.alsoNear),
    map: optional(draft.map),
    coordinates:
      latRaw.length === 0 || lngRaw.length === 0
        ? null
        : { lat: Number(latRaw), lng: Number(lngRaw) },
    source: draft.source.trim() as PlaceSource,
    contributor:
      contributorName === null
        ? null
        : { name: contributorName, href: contributorHref },
  };
}

/**
 * Validate the draft and, when it is clean, build the Place. A blank Contributor
 * becomes nobody rather than an empty person.
 */
export function validatePlace(
  draft: PlaceDraft,
  knownStations: string[],
): { errors: Record<string, string>; place: ValidatedPlace | null } {
  const errors = validatePlaceFields(draft, knownStations);
  if (Object.keys(errors).length > 0) return { errors, place: null };
  return { errors, place: placeFromDraft(draft) };
}

/**
 * The Place record as it is written to disk, keys in the order the existing
 * records use. Optional facts are omitted rather than written as null.
 */
export function placeRecord(
  place: ValidatedPlace,
  slug: string,
): Record<string, unknown> {
  const record: Record<string, unknown> = {
    slug,
    name: place.name,
    kind: place.kind,
    type: place.type,
    station: place.station,
    alsoNear: place.alsoNear,
  };
  if (place.map) record.map = place.map;
  if (place.coordinates) record.coordinates = place.coordinates;
  record.source = place.source;
  if (place.contributor) record.contributor = place.contributor;
  return record;
}

/** The one file a Place adds: `data/places/<slug>.json`. */
export function buildPlaceFile(place: ValidatedPlace, slug: string): PlaceFile {
  return {
    path: placePath(slug),
    contents: `${JSON.stringify(placeRecord(place, slug), null, 2)}\n`,
  };
}

/**
 * The whole act of turning a Place draft into a file: validate, derive the slug,
 * and refuse to overwrite a Place that already lives there.
 */
export function buildPlace(
  draft: PlaceDraft,
  knownStations: string[],
  existingSlugs: string[],
): PlaceBuild {
  const errors = validatePlaceFields(draft, knownStations);
  const slug = deriveSlug(draft.name);

  if (slug.length === 0) {
    errors.slug = "Give the place a name that makes a web address.";
  } else if (existingSlugs.includes(slug)) {
    errors.slug = `A place already lives at "${slug}". Edit it instead.`;
  }

  if (Object.keys(errors).length > 0) {
    return { errors, slug: null, place: null, file: null };
  }

  const place = placeFromDraft(draft);
  return { errors, slug, place, file: buildPlaceFile(place, slug) };
}

/** Prefill the approve form from the Contribution it came from. */
export function contributionToDraft(
  contribution: ValidatedContribution,
): PlaceDraft {
  return {
    ...EMPTY_PLACE_DRAFT,
    name: contribution.name,
    type: contribution.type ?? "",
    station: contribution.station,
    map: contribution.map ?? "",
    source: "contributed",
    contributorName: contribution.contributor?.name ?? "",
    contributorHref: contribution.contributor?.href ?? "",
  };
}

/**
 * The approval transform: a Contribution plus whatever the maintainer confirmed
 * becomes one Place record. The Place is always `contributed`, and the
 * Contributor is carried over when the form left them blank.
 */
export function contributionToPlace(
  contribution: ValidatedContribution,
  fields: PlaceDraft,
  knownStations: string[],
  existingSlugs: string[],
): PlaceBuild {
  const formName = fields.contributorName.trim();
  const formHref = fields.contributorHref.trim();
  const carryContributor = formName.length === 0 && formHref.length === 0;

  const merged: PlaceDraft = {
    ...fields,
    source: "contributed",
    contributorName: carryContributor
      ? (contribution.contributor?.name ?? "")
      : fields.contributorName,
    contributorHref: carryContributor
      ? (contribution.contributor?.href ?? "")
      : fields.contributorHref,
  };

  return buildPlace(merged, knownStations, existingSlugs);
}

/** Read a Place record's own source, so an edit keeps crediting the right origin. */
export function placeSource(value: unknown): PlaceSource {
  return value === "contributed" ? "contributed" : "owner";
}
