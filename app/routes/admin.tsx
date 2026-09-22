import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { lines, places } from "../data/directory";
import { AppBar, AppBarAction } from "../components/AppBar";
import { Field, FIELD_CLASS } from "../components/Field";
import { TYPE_LABELS, KIND_LABELS } from "../lib/labels";
import { publicUrl } from "../lib/routes";
import {
  EMPTY_PLACE_DRAFT,
  PLACE_KINDS,
  PLACE_SOURCES,
  PLACE_TYPES,
  deriveSlug,
  validatePlaceFields,
  type PlaceDraft,
} from "../lib/place";
import type { Route } from "./+types/admin";

/**
 * The admin area is one prerendered shell at `/admin`, protected by Cloudflare
 * Access in front of `/admin*` and `/api/admin/*`. It reads its mode from the
 * query string — `?contribute=<id>`, `?place=<slug>`, `?place=new` — so the
 * build never needs to know an id, and no deep path or serving rewrite is
 * required. Everything it commits goes through `/api/admin/*`.
 */
export const meta: Route.MetaFunction = () => [
  { title: "Admin — NaikTrainJer" },
  { name: "description", content: "NaikTrainJer admin." },
  { name: "robots", content: "noindex, nofollow" },
  { tagName: "link", rel: "canonical", href: publicUrl("/admin") },
];

const STATION_CODES = lines.flatMap((line) =>
  line.stations.map((station) => station.code),
);

const PLACE_SLUGS = new Set(places.map((place) => place.slug));

export default function AdminPage() {
  const [params] = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // The prerendered shell has no query to read, and a deep link must not render a
  // different tree than the shell did, so the first paint is the same on both.
  if (!mounted) return <Shell><p className="text-[13.5px] text-ink-soft">Loading…</p></Shell>;

  const contributionId = params.get("contribute");
  if (contributionId) return <ApprovePage id={contributionId} />;

  const place = params.get("place");
  if (place === "new") return <PlacePage slug={null} />;
  if (place) return <PlacePage slug={place} />;

  return <AdminIndex />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <AppBar subtitle="Admin" action={<AppBarAction href="/">Browse places</AppBarAction>} />
      <main className="mx-auto w-full max-w-[720px] px-5 py-8">{children}</main>
    </div>
  );
}

function AdminIndex() {
  const navigate = useNavigate();
  const [id, setId] = useState("");

  return (
    <Shell>
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">
          Admin
        </h1>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
        Approve a pending Contribution, or add and edit a Place by hand. Every
        change opens a pull request; merging publishes it on the next build.
      </p>

      <h2 className="mt-8 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-soft">
        Approve a Contribution
      </h2>
      <form
        className="mt-2 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (id.trim()) navigate(`/admin?contribute=${encodeURIComponent(id.trim())}`);
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-ink-soft">Contribution id</span>
          <input
            value={id}
            onChange={(event) => setId(event.target.value)}
            placeholder="c-1a2b3c4d"
            className={FIELD_CLASS}
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-paper hover:opacity-85"
        >
          Open
        </button>
      </form>

      <h2 className="mt-8 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-soft">
        Places
      </h2>
      <p className="mt-2">
        <Link to="/admin?place=new" className="text-[13.5px] font-semibold text-ink underline decoration-rule-strong underline-offset-4">
          Add a Place
        </Link>
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {places.map((place) => (
          <li key={place.slug}>
            <Link
              to={`/admin?place=${encodeURIComponent(place.slug)}`}
              className="text-[12.5px] text-ink-soft hover:text-ink"
            >
              {place.name}
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function ApprovePage({ id }: { id: string }) {
  const [draft, setDraft] = useState<PlaceDraft | null>(null);
  const [contributionName, setContributionName] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ slug: string; branch: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/admin/contribution/${encodeURIComponent(id)}`,
        );
        const body = (await response.json()) as {
          draft?: PlaceDraft;
          contribution?: { name?: string };
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || !body.draft) {
          setStatus("error");
          setMessage(body.error ?? "Could not load that contribution.");
          return;
        }
        setDraft(body.draft);
        setContributionName(body.contribution?.name ?? body.draft.name);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Could not load that contribution.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === "loading") {
    return <Shell><p className="text-[13.5px] text-ink-soft">Loading…</p></Shell>;
  }
  if (status === "error" || !draft) {
    return <Shell><p className="text-[13.5px] text-ink">{message}</p></Shell>;
  }
  if (done) {
    return (
      <Shell>
        <h1 className="text-[26px] font-bold tracking-[-0.02em] text-ink">Approved</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
          <strong>{done.slug}</strong> was added to the branch{" "}
          <code>{done.branch}</code> and the Contribution was removed. Merge the
          pull request to publish the Place on the next build.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-[26px] font-bold tracking-[-0.02em] text-ink">
        Approve “{contributionName}”
      </h1>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
        Confirm everything a Place needs, then approve. The Place is added to the
        Contribution&rsquo;s branch and the Contribution is removed.
      </p>
      <PlaceForm
        initial={draft}
        submitLabel="Approve into a Place"
        errors={errors}
        extraError={message}
        onSubmit={async (fields) => {
          setErrors({});
          setMessage("");
          const local = validatePlaceFields(fields, STATION_CODES);
          if (Object.keys(local).length > 0) {
            setErrors(local);
            return;
          }
          const response = await fetch(
            `/api/admin/contribution/${encodeURIComponent(id)}`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(fields),
            },
          );
          const body = (await response.json()) as {
            slug?: string;
            branch?: string;
            errors?: Record<string, string>;
            error?: string;
          };
          if (!response.ok) {
            setErrors(body.errors ?? {});
            setMessage(body.error ?? "Could not approve that contribution.");
            return;
          }
          setDone({ slug: body.slug ?? "", branch: body.branch ?? "" });
        }}
      />
    </Shell>
  );
}

function PlacePage({ slug }: { slug: string | null }) {
  const existing = slug ? places.find((place) => place.slug === slug) : undefined;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [prUrl, setPrUrl] = useState("");

  const initial: PlaceDraft = existing
    ? {
        ...EMPTY_PLACE_DRAFT,
        name: existing.name,
        kind: existing.kind,
        type: existing.type,
        station: existing.station,
        alsoNear: (existing.alsoNear ?? []).join(", "),
        map: existing.map ?? "",
        lat: existing.coordinates ? String(existing.coordinates.lat) : "",
        lng: existing.coordinates ? String(existing.coordinates.lng) : "",
        source: existing.source ?? "owner",
        contributorName: existing.contributor?.name ?? "",
        contributorHref: existing.contributor?.href ?? "",
      }
    : EMPTY_PLACE_DRAFT;

  if (slug && !existing) {
    return (
      <Shell>
        <p className="text-[13.5px] text-ink">No place lives at “{slug}”.</p>
      </Shell>
    );
  }

  if (prUrl) {
    return (
      <Shell>
        <h1 className="text-[26px] font-bold tracking-[-0.02em] text-ink">
          Filed for review
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
          Merge <a className="underline" href={prUrl}>{prUrl}</a> to publish on the
          next build.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-[26px] font-bold tracking-[-0.02em] text-ink">
        {slug ? `Edit “${existing?.name}”` : "Add a Place"}
      </h1>
      <PlaceForm
        initial={initial}
        submitLabel={slug ? "File the edit" : "File the new place"}
        errors={errors}
        extraError={message}
        onSubmit={async (fields) => {
          setErrors({});
          setMessage("");
          const local = validatePlaceFields(fields, STATION_CODES);
          const derived = deriveSlug(fields.name);
          if (!slug && derived && PLACE_SLUGS.has(derived)) {
            local.slug = `A place already lives at "${derived}". Edit it instead.`;
          }
          if (Object.keys(local).length > 0) {
            setErrors(local);
            return;
          }
          const url = slug
            ? `/api/admin/place/${encodeURIComponent(slug)}`
            : "/api/admin/place";
          const response = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(fields),
          });
          const body = (await response.json()) as {
            prUrl?: string;
            errors?: Record<string, string>;
            error?: string;
          };
          if (!response.ok) {
            setErrors(body.errors ?? {});
            setMessage(body.error ?? "Could not file that place.");
            return;
          }
          if (body.prUrl) setPrUrl(body.prUrl);
        }}
      />
    </Shell>
  );
}

function PlaceForm({
  initial,
  submitLabel,
  errors,
  extraError,
  onSubmit,
}: {
  initial: PlaceDraft;
  submitLabel: string;
  errors: Record<string, string>;
  extraError?: string;
  onSubmit: (draft: PlaceDraft) => Promise<void>;
}) {
  const [fields, setFields] = useState<PlaceDraft>(initial);
  const [sending, setSending] = useState(false);

  function set(field: keyof PlaceDraft, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  return (
    <form
      className="mt-6 flex flex-col gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setSending(true);
        try {
          await onSubmit(fields);
        } finally {
          setSending(false);
        }
      }}
    >
      <Field label="Name" error={errors.name} htmlFor="name">
        <input id="name" value={fields.name} onChange={(e) => set("name", e.target.value)} className={FIELD_CLASS} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Kind" error={errors.kind} htmlFor="kind">
          <select id="kind" value={fields.kind} onChange={(e) => set("kind", e.target.value)} className={FIELD_CLASS}>
            <option value="">Choose a kind</option>
            {PLACE_KINDS.map((kind) => (
              <option key={kind} value={kind}>{KIND_LABELS[kind] ?? kind}</option>
            ))}
          </select>
        </Field>

        <Field label="Type" error={errors.type} htmlFor="type">
          <select id="type" value={fields.type} onChange={(e) => set("type", e.target.value)} className={FIELD_CLASS}>
            <option value="">Choose a type</option>
            {PLACE_TYPES.map((type) => (
              <option key={type} value={type}>{TYPE_LABELS[type] ?? type}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Station" error={errors.station} htmlFor="station">
        <select id="station" value={fields.station} onChange={(e) => set("station", e.target.value)} className={FIELD_CLASS}>
          <option value="">Choose a station</option>
          {lines.map((line) => (
            <optgroup key={line.slug} label={line.name}>
              {line.stations.map((station) => (
                <option key={station.code} value={station.code}>{station.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <Field label="Also near (optional, station codes)" error={errors.alsoNear} htmlFor="alsoNear">
        <input id="alsoNear" value={fields.alsoNear} onChange={(e) => set("alsoNear", e.target.value)} placeholder="KJ1, KJ2" className={FIELD_CLASS} />
      </Field>

      <Field label="Map link (optional)" error={errors.map} htmlFor="map">
        <input id="map" type="url" value={fields.map} onChange={(e) => set("map", e.target.value)} placeholder="https://" className={FIELD_CLASS} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Latitude" error={errors.lat} htmlFor="lat">
          <input id="lat" value={fields.lat} onChange={(e) => set("lat", e.target.value)} placeholder="3.1117" className={FIELD_CLASS} />
        </Field>
        <Field label="Longitude" error={errors.lng} htmlFor="lng">
          <input id="lng" value={fields.lng} onChange={(e) => set("lng", e.target.value)} placeholder="101.6366" className={FIELD_CLASS} />
        </Field>
      </div>

      <Field label="Source" error={errors.source} htmlFor="source">
        <select id="source" value={fields.source} onChange={(e) => set("source", e.target.value)} className={FIELD_CLASS}>
          {PLACE_SOURCES.map((source) => (
            <option key={source} value={source}>{source === "owner" ? "Researched by the maintainer" : "Contributed"}</option>
          ))}
        </select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contributor name (optional)" error={errors.contributorName} htmlFor="contributorName">
          <input id="contributorName" value={fields.contributorName} onChange={(e) => set("contributorName", e.target.value)} className={FIELD_CLASS} />
        </Field>
        <Field label="Contributor link (optional)" error={errors.contributorHref} htmlFor="contributorHref">
          <input id="contributorHref" type="url" value={fields.contributorHref} onChange={(e) => set("contributorHref", e.target.value)} placeholder="https://" className={FIELD_CLASS} />
        </Field>
      </div>

      {errors.slug && (
        <p className="text-[12.5px] font-medium text-ink">{errors.slug}</p>
      )}

      {extraError && (
        <p role="alert" className="rounded-md border border-rule-strong bg-band px-3 py-2 text-[12.5px] font-medium text-ink">
          {extraError}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="self-start rounded-md bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-paper hover:opacity-85 disabled:opacity-60"
      >
        {sending ? "Filing…" : submitLabel}
      </button>
    </form>
  );
}

