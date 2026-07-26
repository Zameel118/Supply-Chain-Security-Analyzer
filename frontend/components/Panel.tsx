import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Optional eyebrow label above content */
  label?: string;
  padded?: boolean;
};

/**
 * Shared surface panel: ink plate with manifest hairline border.
 * Replaces ad-hoc rounded slate cards.
 */
export function Panel({
  children,
  label,
  padded = true,
  className = "",
  ...rest
}: Props) {
  return (
    <div
      className={`relative border border-manifest-200/15 bg-ink-800/80 ${padded ? "p-4 sm:p-5" : ""} ${className}`}
      {...rest}
    >
      {label ? (
        <p className="mb-3 font-display text-xs font-bold uppercase tracking-wide text-manifest-200/70">
          {label}
        </p>
      ) : null}
      {children}
    </div>
  );
}
