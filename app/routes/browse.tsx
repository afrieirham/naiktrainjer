import { useLoaderData } from "react-router";
import propertiesData from "../../data/properties.json";

export function loader() {
  const stationsMap = new Map(
    propertiesData.stations.map((s) => [s.slug, s.name])
  );

  const stationOrder = propertiesData.stations.map((s) => s.slug);

  const grouped = new Map<string, typeof propertiesData.places>();
  for (const slug of stationOrder) {
    grouped.set(slug, []);
  }

  for (const place of propertiesData.places) {
    const list = grouped.get(place.station);
    if (list) list.push(place);
  }

  const result: Array<{
    stationSlug: string;
    stationName: string;
    count: number;
    places: typeof propertiesData.places;
  }> = [];

  for (const slug of stationOrder) {
    const places = grouped.get(slug)!;
    if (places.length === 0) continue;
    result.push({
      stationSlug: slug,
      stationName: stationsMap.get(slug) ?? slug,
      count: places.length,
      places,
    });
  }

  return result;
}

const TYPE_LABELS: Record<string, string> = {
  "service-apartment": "Service Apartment",
  apartment: "Apartment",
  condominium: "Condominium",
  flat: "Flat",
  terrace: "Terrace",
  "shop-office": "Shop/Office",
  area: "Area",
};

const KIND_LABELS: Record<string, string> = {
  building: "Building",
  area: "Area",
};

export default function Browse() {
  const stationGroups = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            NaikTrainJer
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Places near LRT · Kelana Jaya line
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 w-full">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
          <aside
            className="md:w-[380px] lg:w-[420px] border-b md:border-b-0 md:border-r border-slate-200 flex flex-col max-h-[42vh] md:max-h-none"
            aria-label="Places list"
          >
            <div className="overflow-y-auto flex-1" role="list">
              {stationGroups.map((group) => (
                <div key={group.stationSlug} role="group" aria-label={group.stationName}>
                  <div
                    className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 px-4 py-2.5"
                  >
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      {group.stationName}{" "}
                      <span className="font-semibold normal-case tracking-normal">
                        ({group.count})
                      </span>
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.places.map((place) => (
                      <div
                        key={place.slug}
                        className="px-4 py-3.5 hover:bg-slate-50 border-l-4 border-l-transparent"
                        role="listitem"
                      >
                        <p className="font-semibold text-sm leading-snug text-slate-900">
                          {place.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {KIND_LABELS[place.kind] ?? place.kind} · {TYPE_LABELS[place.type] ?? place.type}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section
            className="flex-1 flex flex-col min-w-0 min-h-[220px] md:min-h-0 md:sticky md:top-20 md:h-[calc(100vh-13rem)]"
            aria-label="Place details"
          >
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-sm text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200">
                  <svg
                    className="w-6 h-6 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-slate-800">Select a place</p>
                <p className="text-sm text-slate-500 mt-1">
                  Details will appear here.
                </p>
              </div>
            </div>
          </section>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Routes open as Google Maps embeds · default mode is Walk
        </p>
      </main>
    </div>
  );
}
