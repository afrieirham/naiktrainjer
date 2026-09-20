import type { ReactNode } from "react";

interface AppBarProps {
  /** The Line this page belongs to, read from the data. */
  subtitle?: string;
  /** The coverage counts, already formatted. Hidden below `sm`. */
  counts?: string;
  /** A control that belongs to the surface, such as the corridor's type filter. */
  filter?: ReactNode;
  /** The bar's trailing action. */
  action?: ReactNode;
}

/**
 * The site's one piece of navigation chrome. It spans the top of every surface and
 * wraps freely on narrow screens; the wordmark is the way home, so no page needs a
 * separate back link in its own body.
 */
export function AppBar({ subtitle, counts, filter, action }: AppBarProps) {
  return (
    <header className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2.5 border-b border-rule bg-paper px-4 py-3 sm:px-6">
      <a
        href="/"
        className="text-[16px] font-bold tracking-[-0.03em] text-ink transition-opacity hover:opacity-70"
      >
        NaikTrainJer
      </a>

      {subtitle ? (
        <span className="text-[12.5px] font-medium text-ink-soft">{subtitle}</span>
      ) : null}

      {filter}

      <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2.5">
        {counts ? (
          <p className="hidden text-[12.5px] tabular-nums text-ink-soft sm:block">{counts}</p>
        ) : null}
        {action}
      </div>
    </header>
  );
}
