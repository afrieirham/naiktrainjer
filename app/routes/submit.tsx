import type { Route } from "./+types/submit";

export const meta: Route.MetaFunction = () => [
  { title: "Suggest a place — NaikTrainJer" },
  {
    name: "description",
    content:
      "Suggest a place near an LRT station on the Kelana Jaya line to be added to NaikTrainJer.",
  },
  { tagName: "link", rel: "canonical", href: "https://naiktrainjer.com/submit" },
];

const TALLY_URL = "https://tally.so/r/0Q4oRN";

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
              Places near LRT · Kelana Jaya line
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Suggest a place
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Found a place I missed? Add it below — I check every suggestion myself
          before it goes in.
        </p>

        <div className="mt-6">
          {/*
            Tally's iframe scrolls internally, so the height has to be generous
            enough that the four fields and the submit button are reachable
            without touching its inner scrollbar — smaller on wider screens,
            where the form lays out shorter.
          */}
          <iframe
            src={TALLY_URL}
            loading="lazy"
            width="100%"
            className="border-0 h-[840px] md:h-[620px]"
            title="Suggest a place form"
            style={{ minWidth: "100%" }}
          />
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
          <a href="/submit" className="font-semibold text-sky-600 hover:text-sky-800">
            suggest a place
          </a>
        </div>
      </footer>
    </div>
  );
}
