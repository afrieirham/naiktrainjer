export type Place = {
  slug: string;
  name: string;
  kind: "building" | "area";
  type: string;
  station: string;
  alsoNear?: string[];
  map?: string;
  coordinates?: { lat: number; lng: number };
  source?: string;
};

export type Station = {
  slug: string;
  name: string;
  line: string;
};

export type PlaceGroup = {
  stationSlug: string;
  stationName: string;
  count: number;
  places: Place[];
};

export type SortMode = "station" | "az" | "most";

export function filterPlaces(
  places: Place[],
  stationFilter: string,
  typeFilter: string,
): Place[] {
  return places.filter((p) => {
    if (stationFilter && p.station !== stationFilter) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    return true;
  });
}

export function groupByStation(
  filteredPlaces: Place[],
  stations: Station[],
  sortMode: SortMode,
): PlaceGroup[] {
  const stationNameMap = new Map(stations.map((s) => [s.slug, s.name]));
  const stationOrder = stations.map((s) => s.slug);

  const grouped = new Map<string, Place[]>();
  for (const slug of stationOrder) {
    grouped.set(slug, []);
  }

  for (const place of filteredPlaces) {
    const list = grouped.get(place.station);
    if (list) list.push(place);
  }

  const result: PlaceGroup[] = [];

  for (const slug of stationOrder) {
    const places = grouped.get(slug)!;
    if (places.length === 0) continue;
    result.push({
      stationSlug: slug,
      stationName: stationNameMap.get(slug) ?? slug,
      count: places.length,
      places: [...places].sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  if (sortMode === "az") {
    result.sort((a, b) => a.stationName.localeCompare(b.stationName));
  } else if (sortMode === "most") {
    result.sort((a, b) => b.count - a.count || a.stationName.localeCompare(b.stationName));
  }

  return result;
}

export function getUniqueTypes(places: Place[]): string[] {
  return [...new Set(places.map((p) => p.type))].sort();
}
