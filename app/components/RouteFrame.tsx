import type { RouteMode } from "../lib/route-url";

interface RouteFrameProps {
  src: string;
  mode: RouteMode;
}

export function RouteFrame({ src, mode }: RouteFrameProps) {
  const label =
    mode === "walk"
      ? "Walking directions to LRT station"
      : "Driving directions to LRT station";

  return (
    <iframe
      className="w-full border-0 block min-h-[320px] h-[50vh] md:h-[calc(100vh-13rem)] md:min-h-[480px]"
      src={src}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      title={label}
    />
  );
}
