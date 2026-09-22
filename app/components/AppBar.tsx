import type { ReactNode } from "react";

interface AppBarProps {
  /** The Line this page belongs to, read from the data. Hidden on the narrowest screens. */
  subtitle?: string;
  /** The coverage counts, already formatted. Hidden below `sm`. */
  counts?: string;
  /** An optional quiet site link beside the wordmark, as an `AppBarLink`. */
  nav?: ReactNode;
  /** The bar's trailing action, as an `AppBarAction`. */
  action?: ReactNode;
}

/**
 * The site's one piece of navigation chrome. It spans the top of every surface
 * and stays a single row down to 320px: the subtitle and the counts drop out
 * first, then the gaps tighten, and only the wordmark and the surface's action
 * are left. The wordmark is the way home, so no page needs a separate back link
 * in its own body.
 */
export function AppBar({ subtitle, counts, nav, action }: AppBarProps) {
  return (
    <header className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-rule bg-paper px-3 py-2.5 sm:gap-x-5 sm:px-6 sm:py-3">
      <a
        href="/"
        className="text-[16px] font-bold tracking-[-0.03em] text-ink transition-opacity hover:opacity-70"
      >
        NaikTrainJer
      </a>

      {nav}

      {subtitle ? (
        <span className="hidden text-[12.5px] font-medium text-ink-soft sm:inline">
          {subtitle}
        </span>
      ) : null}

      <div className="ml-auto flex items-center gap-x-3 gap-y-2 sm:gap-x-5">
        {counts ? (
          <p className="hidden text-[12.5px] tabular-nums text-ink-soft sm:block">{counts}</p>
        ) : null}
        {action}
      </div>
    </header>
  );
}

/** A quiet site link in the bar, beside the wordmark. */
export function AppBarLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-ink"
    >
      {children}
    </a>
  );
}

/** The bar's primary action. Tightens on a phone so the bar stays one row. */
export function AppBarAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="shrink-0 rounded-md bg-ink px-2.5 py-1.5 text-[12.5px] font-semibold text-paper transition-opacity hover:opacity-85 sm:px-3"
    >
      {children}
    </a>
  );
}
