import { publicUrl } from "../lib/routes";
import { coveredLine, coverage } from "../lib/lines";
import { lines, places } from "../data/directory";
import { AppBar, AppBarAction } from "../components/AppBar";
import type { Route } from "./+types/submit";

/** The Line the directory covers, so no page names a Line by hand. */
const COVERED_LINE = coveredLine(lines, places);
const COVERAGE = coverage(COVERED_LINE, places);
const COUNTS = `${COVERAGE.coveredCount} of ${COVERAGE.total} stations · ${places.length} places`;

export const meta: Route.MetaFunction = () => [
  { title: "Suggest a place — NaikTrainJer" },
  {
    name: "description",
    content:
      `Suggest a place near a station on the ${COVERED_LINE.name} line to be added to NaikTrainJer.`,
  },
  { tagName: "link", rel: "canonical", href: publicUrl("/submit") },
];

const TALLY_FORM_ID = "0Q4oRN";
const TALLY_URL = `https://tally.so/r/${TALLY_FORM_ID}`;

/**
 * Tally's embed script sizes the iframe to the form's real height, so the
 * fields and the Submit button are never cut off behind the frame's own
 * scrollbar — guessing a fixed height got that wrong at every width.
 * `hideTitle` drops the form's own heading, which repeated this page's.
 */
const TALLY_EMBED_URL =
  `https://tally.so/embed/${TALLY_FORM_ID}` +
  "?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1";

export default function SubmitPage() {
  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ "--line-accent": COVERED_LINE.color } as React.CSSProperties}
    >
      <AppBar
        subtitle={`${COVERED_LINE.name} line`}
        counts={COUNTS}
        action={<AppBarAction href="/">Browse places</AppBarAction>}
      />

      <main className="mx-auto w-full max-w-[640px] px-5 py-10 sm:py-14">
        <h1 className="text-[26px] font-bold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[34px]">
          Suggest a place
        </h1>

        <div className="mt-8">
          <iframe
            data-tally-src={TALLY_EMBED_URL}
            loading="lazy"
            width="100%"
            height="500"
            className="border-0 min-h-[780px] md:min-h-[620px]"
            style={{ minWidth: "100%" }}
            title="Suggest a place form"
          />
          <script async src="https://tally.so/widgets/embed.js" />
        </div>

        <p className="mt-6 text-[12.5px] text-ink-soft">
          If the form above does not load,{" "}
          <a
            href={TALLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-ink underline decoration-rule-strong underline-offset-4 transition-opacity hover:opacity-70"
          >
            open it in a new tab
          </a>
          .
        </p>
      </main>
    </div>
  );
}
