export const TYPE_LABELS: Record<string, string> = {
  "service-apartment": "Service Apartment",
  apartment: "Apartment",
  condominium: "Condominium",
  flat: "Flat",
  terrace: "Terrace",
  "shop-office": "Shop/Office",
  area: "Area",
};

export const KIND_LABELS: Record<string, string> = {
  building: "Building",
  area: "Area",
};

/**
 * A Place's kind and type are different facts, but an Area's are the same word
 * ("Area"), so collapse the label rather than printing it twice.
 */
export function metaLabel(place: { kind: string; type: string }): string {
  const kind = KIND_LABELS[place.kind] ?? place.kind;
  const type = TYPE_LABELS[place.type] ?? place.type;
  return kind === type ? type : `${kind} · ${type}`;
}
