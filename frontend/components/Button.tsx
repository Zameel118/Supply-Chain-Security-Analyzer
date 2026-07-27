import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  href?: string;
};

const VARIANT: Record<Variant, string> = {
  primary:
    "quay-btn-primary relative overflow-hidden bg-signal-teal text-white shadow-live-glow hover:bg-signal-tealDim hover:shadow-cyber-glow hover:-translate-y-0.5 active:translate-y-0",
  secondary:
    "border border-manifest-200/35 bg-ink-800/50 text-manifest-100 backdrop-blur hover:border-signal-teal hover:bg-signal-teal/10 hover:text-signal-teal hover:-translate-y-0.5",
  ghost:
    "bg-transparent text-manifest-200/80 hover:text-signal-teal",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  href,
  type = "button",
  ...rest
}: Props) {
  const classes = `inline-flex items-center justify-center gap-2 px-4 py-2 font-sans text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-teal ${VARIANT[variant]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes} {...(rest as object)}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
