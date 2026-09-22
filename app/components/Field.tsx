import type { ReactNode } from "react";

/**
 * The one form-field frame on the site: an uppercase label, the control, and a
 * field error beneath. Shared so the Contribute form and the admin forms cannot
 * drift, and so focus keeps the global Line-coloured ring rather than each field
 * dialling its own.
 */
export const FIELD_CLASS =
  "w-full rounded-md border border-rule-strong bg-paper px-2.5 py-1.5 text-[12.5px] font-medium text-ink";

export function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-soft"
      >
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-[12.5px] font-medium text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
