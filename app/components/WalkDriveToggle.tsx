import type { RouteMode } from "../lib/route-url";

interface WalkDriveToggleProps {
  mode: RouteMode;
  onChange: (mode: RouteMode) => void;
}

export function WalkDriveToggle({ mode, onChange }: WalkDriveToggleProps) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Travel mode">
      <button
        type="button"
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
          mode === "walk"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500"
        }`}
        onClick={() => onChange("walk")}
      >
        Walk
      </button>
      <button
        type="button"
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
          mode === "drive"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500"
        }`}
        onClick={() => onChange("drive")}
      >
        Drive
      </button>
    </div>
  );
}
