import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, copyFileSync, unlinkSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createProvider,
  GoogleProvider,
  OrsProvider,
  FakeProvider,
  FailingProvider,
  type Provider,
} from "../scripts/measure-providers.ts";
import { measurePlaces, formatWalkTime, formatDriveTime } from "../scripts/measure.ts";

const DATA_PATH = resolve(import.meta.dirname, "../data/properties.json");
const BACKUP_PATH = resolve(import.meta.dirname, "../data/properties.json.bak");

interface PlaceData {
  slug: string;
  name: string;
  kind: string;
  type: string;
  station: string;
  alsoNear?: string[];
  map?: string;
  coordinates?: { lat: number; lng: number };
  source?: string;
  walkMinutes?: number;
  walkMeters?: number;
  driveMinutes?: number;
}

interface StationData {
  slug: string;
  name: string;
  line: string;
  coordinates?: { lat: number; lng: number };
}

interface DataFile {
  stations: StationData[];
  places: PlaceData[];
}

function makeFakeData(): DataFile {
  return {
    stations: [
      { slug: "lrt-putra-heights", name: "LRT Putra Heights", line: "kelana-jaya", coordinates: { lat: 2.995, lng: 101.576 } },
    ],
    places: [
      {
        slug: "place-with-coords",
        name: "Place With Coords",
        kind: "building",
        type: "apartment",
        station: "lrt-putra-heights",
        coordinates: { lat: 3.0, lng: 101.57 },
        source: "owner",
      },
      {
        slug: "place-no-coords",
        name: "Place No Coords",
        kind: "building",
        type: "apartment",
        station: "lrt-putra-heights",
        source: "owner",
      },
      {
        slug: "place-already-measured",
        name: "Already Measured",
        kind: "building",
        type: "apartment",
        station: "lrt-putra-heights",
        coordinates: { lat: 3.01, lng: 101.58 },
        walkMinutes: 14,
        walkMeters: 1000,
        driveMinutes: 5,
        source: "owner",
      },
    ],
  };
}

describe("measurePlaces", () => {
  it("measures a place missing figures and skips an already-measured place", async () => {
    const data = makeFakeData();
    const provider = new FakeProvider({ walkMinutes: 12, walkMeters: 800, driveMinutes: 4 });
    const result = await measurePlaces(data, provider, false);

    assert.equal(result.measured, 1);
    assert.equal(result.unchanged, 1);
    assert.equal(result.failed.length, 0);
    assert.equal(result.skipped.length, 1);
    assert.ok(result.skipped[0].includes("place-no-coords"));

    const measured = data.places.find((p) => p.slug === "place-with-coords");
    assert.equal(measured?.walkMinutes, 12);
    assert.equal(measured?.walkMeters, 800);
    assert.equal(measured?.driveMinutes, 4);

    const alreadyMeasured = data.places.find((p) => p.slug === "place-already-measured");
    assert.equal(alreadyMeasured?.walkMinutes, 14);
    assert.equal(alreadyMeasured?.walkMeters, 1000);
    assert.equal(alreadyMeasured?.driveMinutes, 5);
  });

  it("dry-run does not modify data", async () => {
    const data = makeFakeData();
    const provider = new FakeProvider({ walkMinutes: 12, walkMeters: 800, driveMinutes: 4 });
    const result = await measurePlaces(data, provider, true);

    assert.equal(result.measured, 1);
    const place = data.places.find((p) => p.slug === "place-with-coords");
    assert.equal(place?.walkMinutes, undefined);
    assert.equal(place?.walkMeters, undefined);
    assert.equal(place?.driveMinutes, undefined);
  });

  it("a failing provider leaves the place untouched and reports failure", async () => {
    const data = makeFakeData();
    const provider = new FailingProvider();
    const result = await measurePlaces(data, provider, false);

    assert.equal(result.measured, 0);
    assert.ok(result.failed.length > 0);
    assert.ok(result.failed[0].includes("place-with-coords"));
    assert.ok(result.failed[0].includes("Provider failure simulated"));

    const place = data.places.find((p) => p.slug === "place-with-coords");
    assert.equal(place?.walkMinutes, undefined);
  });
});

describe("fake provider", () => {
  it("returns deterministic values", async () => {
    const provider = new FakeProvider({ walkMinutes: 10, walkMeters: 500, driveMinutes: 3 });
    const result = await provider.measure(
      { lat: 3.0, lng: 101.57 },
      "Test Place",
      { lat: 3.01, lng: 101.58 },
      "LRT Test Station",
    );

    assert.equal(result.walkMinutes, 10);
    assert.equal(result.walkMeters, 500);
    assert.equal(result.driveMinutes, 3);
  });

  it("tracks call count", async () => {
    const provider = new FakeProvider();
    assert.equal(provider.getCallCount(), 0);
    await provider.measure({ lat: 3.0, lng: 101.57 }, "A", { lat: 3.01, lng: 101.58 }, "B");
    assert.equal(provider.getCallCount(), 1);
    await provider.measure({ lat: 3.0, lng: 101.57 }, "A", { lat: 3.01, lng: 101.58 }, "B");
    assert.equal(provider.getCallCount(), 2);
  });
});

describe("Google provider", () => {
  it("builds the correct request for a place with coordinates", async () => {
    const requests: string[] = [];
    const mockFetch = async (url: string) => {
      requests.push(url);
      return new Response(JSON.stringify({
        status: "OK",
        rows: [{
          elements: [{
            status: "OK",
            duration: { value: 900, text: "15 mins" },
            distance: { value: 1200, text: "1.2 km" },
          }],
        }],
      }));
    };

    const provider = new GoogleProvider({ apiKey: "test-key", fetchFn: mockFetch as typeof fetch });
    const result = await provider.measure(
      { lat: 3.0001265, lng: 101.5739042 },
      "Serasi Residences",
      { lat: 3.0, lng: 101.6 },
      "LRT Putra Heights",
    );

    assert.equal(result.walkMinutes, 15);
    assert.equal(result.walkMeters, 1200);
    assert.equal(result.driveMinutes, 15);
    assert.equal(requests.length, 2);
    assert.ok(requests[0].includes("mode=walking"));
    assert.ok(requests[1].includes("mode=driving"));
    assert.ok(requests[0].includes("test-key"));
    assert.ok(requests[0].includes("3.0001265"));
    assert.ok(requests[0].includes("101.5739042"));
  });

  it("builds the correct request for a place without coordinates (name fallback)", async () => {
    const requests: string[] = [];
    const mockFetch = async (url: string) => {
      requests.push(url);
      return new Response(JSON.stringify({
        status: "OK",
        rows: [{
          elements: [{
            status: "OK",
            duration: { value: 600, text: "10 mins" },
            distance: { value: 800, text: "800 m" },
          }],
        }],
      }));
    };

    const provider = new GoogleProvider({ apiKey: "key2", fetchFn: mockFetch as typeof fetch });
    const result = await provider.measure(
      null,
      "Camellia Serviced Suites",
      { lat: 3.11, lng: 101.66 },
      "LRT KL Gateway - Universiti",
    );

    assert.equal(result.walkMinutes, 10);
    assert.equal(result.walkMeters, 800);
    assert.equal(result.driveMinutes, 10);
    assert.ok(requests[0].includes("Camellia"));
    assert.ok(!requests[0].includes("lat"));
  });

  it("parses a canned response correctly", async () => {
    const walkResponse = {
      status: "OK",
      rows: [{
        elements: [{
          status: "OK",
          duration: { value: 1260, text: "21 mins" },
          distance: { value: 1850, text: "1.9 km" },
        }],
      }],
    };
    const driveResponse = {
      status: "OK",
      rows: [{
        elements: [{
          status: "OK",
          duration: { value: 300, text: "5 mins" },
          distance: { value: 2100, text: "2.1 km" },
        }],
      }],
    };

    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      return new Response(JSON.stringify(callCount === 1 ? walkResponse : driveResponse));
    };

    const provider = new GoogleProvider({ apiKey: "k", fetchFn: mockFetch as typeof fetch });
    const result = await provider.measure(
      { lat: 3.11, lng: 101.66 },
      "Place",
      { lat: 3.11, lng: 101.66 },
      "Station",
    );

    assert.equal(result.walkMinutes, 21);
    assert.equal(result.walkMeters, 1850);
    assert.equal(result.driveMinutes, 5);
  });
});

describe("ORS provider", () => {
  it("builds the correct request for a place with coordinates", async () => {
    const bodies: string[] = [];
    const mockFetch = async (url: string, init?: RequestInit) => {
      bodies.push(init?.body as string);
      return new Response(JSON.stringify({
        routes: [{
          summary: { distance: 1500, duration: 1100 },
        }],
      }));
    };

    const provider = new OrsProvider({ apiKey: "ors-key", fetchFn: mockFetch as typeof fetch });
    const result = await provider.measure(
      { lat: 3.0001265, lng: 101.5739042 },
      "Serasi Residences",
      { lat: 3.0, lng: 101.6 },
      "LRT Putra Heights",
    );

    assert.equal(result.walkMinutes, 18);
    assert.equal(result.walkMeters, 1500);
    assert.equal(result.driveMinutes, 18);
    assert.equal(bodies.length, 2);

    const walkBody = JSON.parse(bodies[0]);
    assert.equal(walkBody.profile, "foot-walking");
    assert.deepEqual(walkBody.coordinates, [
      [101.5739042, 3.0001265],
      [101.6, 3.0],
    ]);

    const driveBody = JSON.parse(bodies[1]);
    assert.equal(driveBody.profile, "driving-car");
  });

  it("fails when origin has no coordinates", async () => {
    const provider = new OrsProvider({ apiKey: "ors-key", fetchFn: async () => new Response() });
    await assert.rejects(
      () => provider.measure(null, "Place Name", { lat: 3.0, lng: 101.6 }, "Station"),
      /requires coordinates/,
    );
  });
});

describe("idempotence", () => {
  it("second run changes nothing", async () => {
    const data = makeFakeData();
    const provider = new FakeProvider({ walkMinutes: 12, walkMeters: 800, driveMinutes: 4 });

    await measurePlaces(data, provider, false);
    const afterFirst = JSON.stringify(data);

    await measurePlaces(data, provider, false);
    const afterSecond = JSON.stringify(data);

    assert.equal(afterFirst, afterSecond);
    assert.equal(provider.getCallCount(), 1);
  });
});

describe("formatWalkTime", () => {
  it("formats correctly", () => {
    assert.equal(formatWalkTime(14, 1000), "14 min / 1.0 km walk");
    assert.equal(formatWalkTime(1, 400), "1 min / 400 m walk");
    assert.equal(formatWalkTime(5, 2500), "5 min / 2.5 km walk");
  });
});

describe("formatDriveTime", () => {
  it("formats correctly", () => {
    assert.equal(formatDriveTime(5), "5 min drive");
    assert.equal(formatDriveTime(1), "1 min drive");
  });
});

describe("real data file", () => {
  it("no AIza, no API keys in app/ source", () => {
    const appDir = resolve(import.meta.dirname, "../app");
    const files = ["browse.tsx", "place.tsx", "labels.ts", "browse-filter.ts", "route-url.ts"];
    for (const file of files) {
      const content = readFileSync(resolve(appDir, file === "browse.tsx" || file === "place.tsx" ? `routes/${file}` : `lib/${file}`), "utf-8");
      assert.ok(!content.includes("AIza"), `${file} should not contain AIza`);
      assert.ok(!content.includes("GOOGLE_MAPS_API_KEY"), `${file} should not contain GOOGLE_MAPS_API_KEY`);
      assert.ok(!content.includes("ORS_API_KEY"), `${file} should not contain ORS_API_KEY`);
    }
  });

  it("no API keys in data file", () => {
    const content = readFileSync(DATA_PATH, "utf-8");
    assert.ok(!content.includes("AIza"), "data file should not contain AIza");
    assert.ok(!content.includes("GOOGLE_MAPS_API_KEY"), "data file should not contain GOOGLE_MAPS_API_KEY");
    assert.ok(!content.includes("ORS_API_KEY"), "data file should not contain ORS_API_KEY");
  });
});

describe("provider seam", () => {
  it("createProvider returns correct types", () => {
    const google = createProvider("google", { apiKey: "k" });
    assert.ok(google instanceof GoogleProvider);

    const ors = createProvider("ors", { apiKey: "k" });
    assert.ok(ors instanceof OrsProvider);

    const fake = createProvider("fake");
    assert.ok(fake instanceof FakeProvider);
  });

  it("unknown provider throws", () => {
    assert.throws(
      () => createProvider("unknown" as any),
      /Unknown provider/,
    );
  });
});

describe("station coordinates (regression guard)", () => {
  it("destination is the Place's own Nearest station's coordinates, not a constant", async () => {
    const destinations: { lat: number; lng: number }[] = [];
    const mockProvider = new FakeProvider();

    const data: DataFile = {
      stations: [
        { slug: "station-a", name: "Station A", line: "kelana-jaya", coordinates: { lat: 3.10, lng: 101.60 } },
        { slug: "station-b", name: "Station B", line: "kelana-jaya", coordinates: { lat: 3.12, lng: 101.67 } },
      ],
      places: [
        { slug: "place-a", name: "Place A", kind: "building", type: "apartment", station: "station-a", coordinates: { lat: 3.09, lng: 101.59 }, source: "owner" },
        { slug: "place-b", name: "Place B", kind: "building", type: "apartment", station: "station-b", coordinates: { lat: 3.13, lng: 101.68 }, source: "owner" },
      ],
    };

    // Intercept: record every destination the provider receives
    const spy: Provider = {
      async measure(origin, originName, destination, destinationName) {
        destinations.push({ ...destination });
        return mockProvider.measure(origin, originName, destination, destinationName);
      },
    };

    await measurePlaces(data, spy, true);

    assert.equal(destinations.length, 2);
    assert.deepEqual(destinations[0], { lat: 3.10, lng: 101.60 });
    assert.deepEqual(destinations[1], { lat: 3.12, lng: 101.67 });
    // Two different stations → two different destinations
    assert.notDeepEqual(destinations[0], destinations[1]);
  });

  it("hardcoded constant would fail: station-a and station-b produce different destinations", async () => {
    const hardcoded = { lat: 3.0, lng: 101.6 };
    const destinations: { lat: number; lng: number }[] = [];

    const data: DataFile = {
      stations: [
        { slug: "station-a", name: "Station A", line: "kelana-jaya", coordinates: { lat: 3.10, lng: 101.60 } },
        { slug: "station-b", name: "Station B", line: "kelana-jaya", coordinates: { lat: 3.12, lng: 101.67 } },
      ],
      places: [
        { slug: "place-a", name: "Place A", kind: "building", type: "apartment", station: "station-a", coordinates: { lat: 3.09, lng: 101.59 }, source: "owner" },
        { slug: "place-b", name: "Place B", kind: "building", type: "apartment", station: "station-b", coordinates: { lat: 3.13, lng: 101.68 }, source: "owner" },
      ],
    };

    const spy: Provider = {
      async measure(origin, originName, destination, destinationName) {
        destinations.push({ ...destination });
        return { walkMinutes: 10, walkMeters: 500, driveMinutes: 3 };
      },
    };

    await measurePlaces(data, spy, true);

    // If a hardcoded constant were used, both destinations would be identical
    assert.notDeepEqual(destinations[0], destinations[1],
      "destinations must differ — a hardcoded constant would make them equal");
    // The actual station coords differ from the hardcoded point
    assert.notDeepEqual(destinations[0], hardcoded);
    assert.notDeepEqual(destinations[1], hardcoded);
  });

  it("station coordinates are present for every station in the data file", () => {
    const raw = readFileSync(DATA_PATH, "utf-8");
    const data = JSON.parse(raw);
    for (const station of data.stations) {
      assert.ok(station.coordinates, `Station "${station.slug}" must have coordinates`);
      assert.equal(typeof station.coordinates.lat, "number");
      assert.equal(typeof station.coordinates.lng, "number");
    }
  });
});

describe("skip vs fail", () => {
  it("a Place whose Station has no coordinates is skipped, not failed", async () => {
    const data: DataFile = {
      stations: [
        { slug: "station-no-coords", name: "Station No Coords", line: "kelana-jaya" },
      ],
      places: [
        { slug: "place-orphan", name: "Orphan Place", kind: "building", type: "apartment", station: "station-no-coords", coordinates: { lat: 3.0, lng: 101.57 }, source: "owner" },
      ],
    };

    const provider = new FakeProvider();
    const result = await measurePlaces(data, provider, false);

    assert.equal(result.measured, 0);
    assert.equal(result.failed.length, 0);
    assert.equal(result.skipped.length, 1);
    assert.ok(result.skipped[0].includes("Station No Coords"));
  });

  it("skipped does not affect exit code, but provider failure does", async () => {
    const dataSkipped: DataFile = {
      stations: [
        { slug: "s1", name: "S1", line: "kelana-jaya" },
      ],
      places: [
        { slug: "p1", name: "P1", kind: "building", type: "apartment", station: "s1", coordinates: { lat: 3.0, lng: 101.57 }, source: "owner" },
      ],
    };

    // Skipped → exit 0
    const resultSkip = await measurePlaces(dataSkipped, new FakeProvider(), false);
    assert.equal(resultSkip.failed.length, 0);
    assert.equal(resultSkip.skipped.length, 1);

    const dataFailed: DataFile = {
      stations: [
        { slug: "s1", name: "S1", line: "kelana-jaya", coordinates: { lat: 3.0, lng: 101.57 } },
      ],
      places: [
        { slug: "p1", name: "P1", kind: "building", type: "apartment", station: "s1", coordinates: { lat: 3.0, lng: 101.57 }, source: "owner" },
      ],
    };

    // Provider error → exit 1
    const resultFail = await measurePlaces(dataFailed, new FailingProvider(), false);
    assert.equal(resultFail.failed.length, 1);
    assert.ok(resultFail.failed[0].includes("p1"));
    assert.equal(resultFail.skipped.length, 0);
  });
});

describe("validate-data.mjs", () => {
  it("rejects a station with out-of-envelope coordinates", async () => {
    const { execSync } = await import("node:child_process");
    const { writeFileSync: wf, readFileSync: rf, copyFileSync: cf, unlinkSync: ul } = await import("node:fs");
    const path = resolve(import.meta.dirname, "../data/properties.json");
    const bak = path + ".validate-test.bak";
    cf(path, bak);
    try {
      const data = JSON.parse(rf(path, "utf-8"));
      // Inject an out-of-bounds station coordinate
      data.stations[0].coordinates = { lat: 99.0, lng: 99.0 };
      wf(path, JSON.stringify(data, null, 2) + "\n");
      assert.throws(
        () => execSync("node scripts/validate-data.mjs", { cwd: resolve(import.meta.dirname, ".."), encoding: "utf-8" }),
        /outside Klang Valley/,
      );
    } finally {
      cf(bak, path);
      ul(bak);
    }
  });
});
