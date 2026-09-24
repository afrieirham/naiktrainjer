declare module "*/export-network.mjs" {
  export type SourceStation = {
    id: string;
    code: string;
    name: string;
    sort: number;
    geoPoint: { lat: number; lon: number };
    interchange?: string[];
    connecting?: string[];
  };

  export type SourceLine = {
    name: string;
    code: string;
    color: string;
    stations: string[];
  };

  export type BakedStation = {
    code: string;
    name: string;
    sort: number;
    coordinates: { lat: number; lng: number };
    interchange: string[];
    connecting: string[];
  };

  export type BakedLine = {
    slug: string;
    code: string;
    name: string;
    color: string;
    stations: BakedStation[];
  };

  export function buildNetwork(
    lines: SourceLine[],
    networkStations: SourceStation[],
  ): BakedLine[];
}
