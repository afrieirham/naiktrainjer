import { AppBar, AppBarAction } from "../components/AppBar";
import { creditedContributors } from "../lib/contributors";
import { coveredLine, coverage } from "../lib/lines";
import { lines, places } from "../data/directory";
import { publicUrl } from "../lib/routes";
import type { Route } from "./+types/contributors";

/** The Line the directory covers, so no page names a Line by hand. */
const COVERED_LINE = coveredLine(lines, places);
const COVERAGE = coverage(COVERED_LINE, places);
const COUNTS = `${COVERAGE.coveredCount} of ${COVERAGE.total} stations · ${places.length} places`;
const CREDITS = creditedContributors(places);

export const meta: Route.MetaFunction = () => [
  { title: "Contributors — NaikTrainJer" },
  {
    name: "description",
    content:
      "The people who contributed a place to NaikTrainJer, and the places they contributed.",
  },
  { tagName: "link", rel: "canonical", href: publicUrl("/contributors") },
];

const QUIET_LINK =
  "underline decoration-rule-strong underline-offset-4 transition-colors hover:text-ink";

export default function ContributorsPage() {
  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ "--line-accent": COVERED_LINE.color } as React.CSSProperties}
    >
      <AppBar
        subtitle={`${COVERED_LINE.name} line`}
        counts={COUNTS}
        action={<AppBarAction href="/contribute/">Contribute a place</AppBarAction>}
      />

      <main className="mx-auto w-full max-w-[640px] px-5 py-10 sm:py-14">
        <h1 className="text-[26px] font-bold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[34px]">
          Contributors
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
          Every place here is either found by hand or sent in by someone. These are
          the people who sent one in.
        </p>

        {CREDITS.length === 0 ? (
          <p className="mt-8 text-[13.5px] leading-relaxed text-ink-soft">
            Nobody has contributed a place yet.{" "}
            <a href="/contribute/" className={QUIET_LINK}>
              Yours could be the first.
            </a>
          </p>
        ) : (
          <ul className="mt-8 border-b border-rule">
            {CREDITS.map((credit) => (
              <li
                key={`${credit.name}\u0000${credit.href ?? ""}`}
                className="border-t border-rule py-4"
              >
                <p className="text-[13.5px] font-semibold text-ink">
                  {credit.href ? (
                    <a
                      href={credit.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-rule-strong underline-offset-4 transition-opacity hover:opacity-70"
                    >
                      {credit.name}
                    </a>
                  ) : (
                    credit.name
                  )}
                </p>
                <p className="mt-1 text-[12.5px] text-ink-soft">
                  {credit.places.map((place, index) => (
                    <span key={place.slug}>
                      {index > 0 ? ", " : null}
                      <a href={`/places/${place.slug}/`} className={QUIET_LINK}>
                        {place.name}
                      </a>
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
