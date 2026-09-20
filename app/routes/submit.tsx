import { publicUrl } from "../lib/routes";
import { coveredLine, type Line } from "../lib/lines";
import propertiesData from "../../data/properties.json";
import type { Station } from "../lib/browse-filter";
import type { Route } from "./+types/submit";

/** The Line the directory covers, so no page names a Line by hand. */
const COVERED_LINE = coveredLine(
  propertiesData.lines as Line[],
  propertiesData.stations as Station[],
);

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
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div>
            <a
              href="/"
              className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight hover:text-sky-700 transition"
            >
              NaikTrainJer
            </a>
            <p className="text-sm text-slate-500 mt-0.5">
              Places near the {COVERED_LINE.name} line
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Suggest a place
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Found a place I missed? Add it below — I check every suggestion myself
          before it goes in.
        </p>

        <div className="mt-6">
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

        <p className="mt-4 text-sm text-slate-500">
          If the form above does not load,{" "}
          <a
            href={TALLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sky-600 hover:text-sky-800"
          >
            open it in a new tab
          </a>.
        </p>
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-slate-500">
          NaikTrainJer —{" "}
          <a href="/submit/" className="font-semibold text-sky-600 hover:text-sky-800">
            suggest a place
          </a>
        </div>
      </footer>
    </div>
  );
}
