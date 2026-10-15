declare module "*/export-places.mjs" {
  export type SourcePlace = {
    id: string;
    slug: string;
    name: string;
    kind: string;
    type: string;
    map: string;
    source: string;
    contributor_name?: string;
    contributor_href?: string;
  };

  export type SourceConnection = {
    id: string;
    place: string;
    station: string;
    embed?: string;
  };

  export type SourceStation = {
    id: string;
    code: string;
  };

  export type BakedPlaceConnection = {
    station: string;
    embed?: string;
  };

  export type BakedPlace = {
    slug: string;
    name: string;
    kind: "building" | "area";
    type: string;
    map: string;
    connections: BakedPlaceConnection[];
    source: string;
    contributor?: { name: string; href: string | null };
  };

  export function buildPlaces(
    places: SourcePlace[],
    connections: SourceConnection[],
    stations: SourceStation[],
  ): BakedPlace[];
}
