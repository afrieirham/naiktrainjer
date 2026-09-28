import { useRef, useState } from "react";
import { publicUrl } from "../lib/routes";
import { coveredLine, coverage } from "../lib/lines";
import { lines, places } from "../data/directory";
import { AppBar, AppBarAction, AppBarLink } from "../components/AppBar";
import { Field, FIELD_CLASS } from "../components/Field";
import { TYPE_LABELS } from "../lib/labels";
import { useTurnstile } from "../hooks/use-turnstile";
import {
  CONTRIBUTION_TYPES,
  MAX_NOTE,
  validateFields,
  type ContributionDraft,
} from "../lib/contribution";
import type { Route } from "./+types/contribute";

/** The Line the directory covers, so no page names a Line by hand. */
const COVERED_LINE = coveredLine(lines, places);
const COVERAGE = coverage(COVERED_LINE, places);
const COUNTS = `${COVERAGE.coveredCount} of ${COVERAGE.total} stations · ${places.length} places`;

/** Every Station on every Line, by network code, exactly as the network holds it. */
const STATION_CODES = lines.flatMap((line) =>
  line.stations.map((station) => station.code),
);

export const meta: Route.MetaFunction = () => [
  { title: "Contribute a place — NaikTrainJer" },
  {
    name: "description",
    content:
      `Contribute a place near a station on the ${COVERED_LINE.name} line — or any Line on the network — to be added to NaikTrainJer. Every contribution is reviewed by hand.`,
  },
  { tagName: "link", rel: "canonical", href: publicUrl("/contribute") },
];

const EMPTY_DRAFT: ContributionDraft = {
  name: "",
  connections: [{ station: "", embed: "" }],
  type: "",
  map: "",
  note: "",
  contributorName: "",
  contributorHref: "",
};

export default function ContributePage() {
  const [fields, setFields] = useState<ContributionDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const turnstileRef = useRef<HTMLDivElement>(null);
  const { getToken: getTurnstileToken, dispose: disposeTurnstile } =
    useTurnstile(turnstileRef);

  function set(field: keyof ContributionDraft, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  /** One row of the Station editor: its Station and its optional Route frame. */
  function setConnection(
    index: number,
    patch: Partial<ContributionDraft["connections"][number]>,
  ) {
    setFields((current) => ({
      ...current,
      connections: current.connections.map((connection, i) =>
        i === index ? { ...connection, ...patch } : connection,
      ),
    }));
  }

  function addConnection() {
    setFields((current) => ({
      ...current,
      connections: [...current.connections, { station: "", embed: "" }],
    }));
  }

  function removeConnection(index: number) {
    setFields((current) => ({
      ...current,
      connections:
        current.connections.length === 1
          ? current.connections
          : current.connections.filter((_, i) => i !== index),
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    const local = validateFields(fields, STATION_CODES, [...CONTRIBUTION_TYPES]);
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }

    setSending(true);

    try {
      const response = await fetch("/api/contribute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...fields,
          turnstileToken: await getTurnstileToken(),
        }),
      });

      const result = (await response.json()) as {
        prUrl?: string;
        errors?: Record<string, string>;
        error?: string;
      };

      if (!response.ok) {
        setErrors(
          result.errors ?? { form: result.error ?? "Something went wrong." },
        );
        return;
      }

      // Retire the widget before its container is replaced by the thank-you
      // view, or Turnstile is left holding a widget whose DOM has gone.
      disposeTurnstile();
      setSubmitted(true);
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ "--line-accent": COVERED_LINE.color } as React.CSSProperties}
    >
      <AppBar
        subtitle={`${COVERED_LINE.name} line`}
        counts={COUNTS}
        nav={<AppBarLink href="/contributors/">Contributors</AppBarLink>}
        action={<AppBarAction href="/">Browse places</AppBarAction>}
      />

      <main className="mx-auto w-full max-w-[640px] px-5 py-10 sm:py-14">
        {submitted ? (
          <>
            <h1 className="text-[26px] font-bold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[34px]">
              Thank you
            </h1>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
              Your contribution is pending review. Once it is approved it becomes
              a place in the directory, on the next build.
            </p>
            <p className="mt-6">
              <AppBarAction href="/">Browse places</AppBarAction>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[26px] font-bold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[34px]">
              Contribute a place
            </h1>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
              Know a place near a station? Give it a name and pick the stations it
              is near, adding the route you walked if you have it. Every
              contribution is reviewed by hand before it appears, and there is no
              account to create.
            </p>

            <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
              <Field label="Place name" error={errors.name} htmlFor="name">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="off"
                  aria-required="true"
                  value={fields.name}
                  onChange={(event) => set("name", event.target.value)}
                  className={FIELD_CLASS}
                />
              </Field>

              <fieldset className="flex flex-col gap-3">
                <legend className="text-[12px] font-medium text-ink-soft">
                  Connections — the stations this place is near
                </legend>
                {fields.connections.map((connection, index) => (
                  <div
                    key={index}
                    className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <select
                      aria-label={`Station ${index + 1}`}
                      aria-required="true"
                      value={connection.station}
                      onChange={(event) =>
                        setConnection(index, { station: event.target.value })
                      }
                      className={FIELD_CLASS}
                    >
                      <option value="">Choose a station</option>
                      {lines.map((line) => (
                        <optgroup key={line.slug} label={line.name}>
                          {line.stations.map((station) => (
                            <option key={station.code} value={station.code}>
                              {station.code} {station.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <input
                      aria-label={`Route frame ${index + 1} (optional)`}
                      value={connection.embed}
                      onChange={(event) =>
                        setConnection(index, { embed: event.target.value })
                      }
                      placeholder="Route frame (optional)"
                      className={FIELD_CLASS}
                    />
                    <button
                      type="button"
                      onClick={() => removeConnection(index)}
                      disabled={fields.connections.length === 1}
                      className="self-start rounded-md border border-rule-strong px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:bg-band disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {errors.connections && (
                  <p className="text-[12px] font-medium text-ink">
                    {errors.connections}
                  </p>
                )}
                <button
                  type="button"
                  onClick={addConnection}
                  className="self-start rounded-md border border-rule-strong px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:bg-band"
                >
                  Add another station
                </button>
              </fieldset>

              <Field label="Type (optional)" error={errors.type} htmlFor="type">
                <select
                  id="type"
                  name="type"
                  value={fields.type}
                  onChange={(event) => set("type", event.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="">Not sure</option>
                  {CONTRIBUTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {TYPE_LABELS[type] ?? type}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Google Maps link"
                error={errors.map}
                htmlFor="map"
              >
                <input
                  id="map"
                  name="map"
                  type="url"
                  inputMode="url"
                  aria-required="true"
                  placeholder="https://"
                  value={fields.map}
                  onChange={(event) => set("map", event.target.value)}
                  className={FIELD_CLASS}
                />
              </Field>

              <Field
                label="A note (optional)"
                error={errors.note}
                htmlFor="note"
              >
                <textarea
                  id="note"
                  name="note"
                  rows={3}
                  maxLength={MAX_NOTE}
                  value={fields.note}
                  onChange={(event) => set("note", event.target.value)}
                  className={`${FIELD_CLASS} py-2`}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Your name (optional)"
                  error={errors.contributorName}
                  htmlFor="contributorName"
                >
                  <input
                    id="contributorName"
                    name="contributorName"
                    type="text"
                    autoComplete="name"
                    placeholder="Social handle or name"
                    value={fields.contributorName}
                    onChange={(event) => set("contributorName", event.target.value)}
                    className={FIELD_CLASS}
                  />
                </Field>

                <Field
                  label="Your link (optional)"
                  error={errors.contributorHref}
                  htmlFor="contributorHref"
                >
                  <input
                    id="contributorHref"
                    name="contributorHref"
                    type="url"
                    inputMode="url"
                    placeholder="https://"
                    value={fields.contributorHref}
                    onChange={(event) => set("contributorHref", event.target.value)}
                    className={FIELD_CLASS}
                  />
                </Field>
              </div>

              <div ref={turnstileRef} />

              {errors.form && (
                <p
                  role="alert"
                  className="rounded-md border border-rule-strong bg-band px-3 py-2 text-[12.5px] font-medium text-ink"
                >
                  {errors.form}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-md bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send for review"}
                </button>
                <span className="text-[12.5px] text-ink-soft">
                  Reviewed by hand before it appears.
                </span>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}


