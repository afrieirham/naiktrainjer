import type { RouteMode } from "../lib/route-url";

interface RouteFrameProps {
  src: string;
  mode: RouteMode;
  /**
   * The frame's own sizing. The default is the Place page's stacked layout; the
   * Browse page passes a fill class because its map owns a whole column.
   */
  className?: string;
}

const DEFAULT_CLASS =
  "w-full border-0 block min-h-[320px] h-[50vh] md:h-[calc(100vh-13rem)] md:min-h-[480px]";

export function RouteFrame({ src, mode, className = DEFAULT_CLASS }: RouteFrameProps) {
  const label =
    mode === "walk"
      ? "Walking directions to LRT station"
      : "Driving directions to LRT station";

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
