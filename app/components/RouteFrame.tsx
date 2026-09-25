import type { RouteMode } from "../lib/route-url";
import { OpenIcon } from "./icons";

interface RouteFrameProps {
  /** The stored Route frame, or null when the Connection stored none. */
  src: string | null;
  mode: RouteMode;
  /**
   * The Place's Map link, shown as a usable link where the frame would sit when
   * no Route frame is stored. A share link cannot be framed, so it never is.
   */
  mapUrl: string;
  /**
   * The frame's own sizing. The default is the Place page's stacked layout; the
   * Browse page passes a fill class because its map owns a whole column.
   */
  className?: string;
}

const DEFAULT_CLASS =
  "w-full border-0 block min-h-[320px] h-[50vh] md:h-[calc(100vh-13rem)] md:min-h-[480px]";

export function RouteFrame({
  src,
  mode,
  mapUrl,
  className = DEFAULT_CLASS,
}: RouteFrameProps) {
  const label =
    mode === "walk"
      ? "Walking directions to LRT station"
      : "Driving directions to LRT station";

  if (!src) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="flex max-w-[36ch] flex-col items-center gap-3 px-6 text-center">
          <p className="text-[13.5px] leading-relaxed text-ink-soft">
            No walking route is stored for this station yet.
          </p>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft underline decoration-rule-strong underline-offset-4 transition-colors hover:text-ink"
          >
            Place on Google Maps
            <OpenIcon size={13} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <iframe
      className={className}
      src={src}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      title={label}
    />
  );
}
