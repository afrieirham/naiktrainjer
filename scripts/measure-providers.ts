export interface Measurement {
  walkMinutes: number;
  walkMeters: number;
  driveMinutes: number;
}

export interface Provider {
  measure(
    origin: { lat: number; lng: number } | null,
    originName: string,
    destination: { lat: number; lng: number },
    destinationName: string,
  ): Promise<Measurement>;
}

export interface ProviderOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
}

function validateMeasurement(m: Measurement): void {
  if (!Number.isFinite(m.walkMinutes) || m.walkMinutes <= 0 || m.walkMinutes > 120) {
    throw new Error(`Implausible walkMinutes: ${m.walkMinutes}`);
  }
  if (!Number.isFinite(m.walkMeters) || m.walkMeters <= 0 || m.walkMeters > 50000) {
    throw new Error(`Implausible walkMeters: ${m.walkMeters}`);
  }
  if (!Number.isFinite(m.driveMinutes) || m.driveMinutes <= 0 || m.driveMinutes > 60) {
    throw new Error(`Implausible driveMinutes: ${m.driveMinutes}`);
  }
}

export class GoogleProvider implements Provider {
  private apiKey: string;
  private fetchFn: typeof fetch;

  constructor(opts: ProviderOptions) {
    this.apiKey = opts.apiKey;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  async measure(
    origin: { lat: number; lng: number } | null,
    originName: string,
    destination: { lat: number; lng: number },
    destinationName: string,
  ): Promise<Measurement> {
    const originStr = origin ? `${origin.lat},${origin.lng}` : originName;
    const destStr = `${destination.lat},${destination.lng}`;

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destStr)}&key=${this.apiKey}&mode=walking`;
    const driveUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destStr)}&key=${this.apiKey}&mode=driving`;

    const [walkRes, driveRes] = await Promise.all([
      this.fetchFn(url),
      this.fetchFn(driveUrl),
    ]);

    if (!walkRes.ok) throw new Error(`Google walk request failed: ${walkRes.status}`);
    if (!driveRes.ok) throw new Error(`Google drive request failed: ${driveRes.status}`);

    const walkData = await walkRes.json() as {
      status: string;
      rows: Array<{
        elements: Array<{
          status: string;
          distance?: { value: number; text: string };
          duration?: { value: number; text: string };
        }>;
      }>;
    };
    const driveData = await driveRes.json() as typeof walkData;

    if (walkData.status !== "OK" || !walkData.rows[0]?.elements[0]) {
      throw new Error(`Google walk response invalid: ${walkData.status}`);
    }
    if (driveData.status !== "OK" || !driveData.rows[0]?.elements[0]) {
      throw new Error(`Google drive response invalid: ${driveData.status}`);
    }

    const walkElement = walkData.rows[0].elements[0];
    const driveElement = driveData.rows[0].elements[0];

    if (walkElement.status !== "OK" || !walkElement.duration || !walkElement.distance) {
      throw new Error(`Google walk element status: ${walkElement.status}`);
    }
    if (driveElement.status !== "OK" || !driveElement.duration) {
      throw new Error(`Google drive element status: ${driveElement.status}`);
    }

    const measurement: Measurement = {
      walkMinutes: Math.round(walkElement.duration.value / 60),
      walkMeters: walkElement.distance.value,
      driveMinutes: Math.round(driveElement.duration.value / 60),
    };

    validateMeasurement(measurement);
    return measurement;
  }
}

export class OrsProvider implements Provider {
  private apiKey: string;
  private fetchFn: typeof fetch;

  constructor(opts: ProviderOptions) {
    this.apiKey = opts.apiKey;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  async measure(
    origin: { lat: number; lng: number } | null,
    originName: string,
    destination: { lat: number; lng: number },
    destinationName: string,
  ): Promise<Measurement> {
    const originCoords = origin ?? { lat: 0, lng: 0 };
    if (!origin) {
      throw new Error("OpenRouteService requires coordinates for the origin");
    }

    const walkBody = JSON.stringify({
      coordinates: [
        [originCoords.lng, originCoords.lat],
        [destination.lng, destination.lat],
      ],
      profile: "foot-walking",
    });

    const driveBody = JSON.stringify({
      coordinates: [
        [originCoords.lng, originCoords.lat],
        [destination.lng, destination.lat],
      ],
      profile: "driving-car",
    });

    const [walkRes, driveRes] = await Promise.all([
      this.fetchFn("https://api.openrouteservice.org/v2/directions/foot-walking", {
        method: "POST",
        headers: {
          Authorization: this.apiKey,
          "Content-Type": "application/json",
        },
        body: walkBody,
      }),
      this.fetchFn("https://api.openrouteservice.org/v2/directions/driving-car", {
        method: "POST",
        headers: {
          Authorization: this.apiKey,
          "Content-Type": "application/json",
        },
        body: driveBody,
      }),
    ]);

    if (!walkRes.ok) throw new Error(`ORS walk request failed: ${walkRes.status}`);
    if (!driveRes.ok) throw new Error(`ORS drive request failed: ${driveRes.status}`);

    const walkData = await walkRes.json() as {
      routes?: Array<{ summary: { distance: number; duration: number } }>;
    };
    const driveData = await driveRes.json() as typeof walkData;

    const walkRoute = walkData.routes?.[0];
    const driveRoute = driveData.routes?.[0];

    if (!walkRoute) throw new Error("ORS walk response has no routes");
    if (!driveRoute) throw new Error("ORS drive response has no routes");

    const measurement: Measurement = {
      walkMinutes: Math.round(walkRoute.summary.duration / 60),
      walkMeters: Math.round(walkRoute.summary.distance),
      driveMinutes: Math.round(driveRoute.summary.duration / 60),
    };

    validateMeasurement(measurement);
    return measurement;
  }
}

export class FakeProvider implements Provider {
  private callCount = 0;
  private walkMinutes: number;
  private walkMeters: number;
  private driveMinutes: number;

  constructor(opts?: { walkMinutes?: number; walkMeters?: number; driveMinutes?: number }) {
    this.walkMinutes = opts?.walkMinutes ?? 14;
    this.walkMeters = opts?.walkMeters ?? 1000;
    this.driveMinutes = opts?.driveMinutes ?? 5;
  }

  async measure(
    _origin: { lat: number; lng: number } | null,
    _originName: string,
    _destination: { lat: number; lng: number },
    _destinationName: string,
  ): Promise<Measurement> {
    this.callCount++;
    return {
      walkMinutes: this.walkMinutes,
      walkMeters: this.walkMeters,
      driveMinutes: this.driveMinutes,
    };
  }

  getCallCount(): number {
    return this.callCount;
  }
}

export class FailingProvider implements Provider {
  async measure(): Promise<Measurement> {
    throw new Error("Provider failure simulated");
  }
}

export type ProviderName = "google" | "ors" | "fake";

export function createProvider(
  name: ProviderName,
  opts?: { apiKey?: string; fetchFn?: typeof fetch; walkMinutes?: number; walkMeters?: number; driveMinutes?: number },
): Provider {
  switch (name) {
    case "google":
      return new GoogleProvider({ apiKey: opts?.apiKey ?? "", fetchFn: opts?.fetchFn });
    case "ors":
      return new OrsProvider({ apiKey: opts?.apiKey ?? "", fetchFn: opts?.fetchFn });
    case "fake":
      return new FakeProvider(opts);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
