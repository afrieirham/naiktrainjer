import type { RouteMode } from "../lib/route-url";

/**
 * The travel mode, in the site's own vocabulary. A real control, so it takes ink
 * as its selection language rather than the Line's accent — the accent belongs to
 * the corridor, not to a segmented control.
 */
export function TravelMode({
  mode,
  onChange,
}: {
  mode: RouteMode;
  onChange: (mode: RouteMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Travel mode"
      className="inline-flex shrink-0 rounded-md border border-rule-strong p-[2px]"
    >
      {(
        [
          ["walk", "Walk"],
          ["drive", "Drive"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className={`rounded-[4px] px-2.5 py-1 text-[12.5px] font-semibold transition-colors ${
            mode === value ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
