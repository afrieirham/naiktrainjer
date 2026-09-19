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

export const TYPE_CLASSES: Record<string, string> = {
  "service-apartment": "bg-teal-50 text-teal-700 ring-teal-600/15",
  apartment: "bg-sky-50 text-sky-700 ring-sky-600/15",
  condominium: "bg-violet-50 text-violet-700 ring-violet-600/15",
  flat: "bg-amber-50 text-amber-800 ring-amber-600/15",
  terrace: "bg-orange-50 text-orange-800 ring-orange-600/15",
  "shop-office": "bg-rose-50 text-rose-700 ring-rose-600/15",
  area: "bg-slate-100 text-slate-600 ring-slate-500/10",
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

export function formatMeasurement(
  walkMinutes: number,
  walkMeters: number,
  driveMinutes: number,
): string {
  const km = walkMeters / 1000;
  const walkDistText = km < 1 ? `${walkMeters} m` : `${km.toFixed(1)} km`;
  const walkMinText = walkMinutes === 1 ? "1 min" : `${walkMinutes} min`;
  return `${walkMinText} / ${walkDistText} walk`;
}
