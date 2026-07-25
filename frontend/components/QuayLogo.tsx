import Image from "next/image";

type Props = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

/** Quaywatch mark + optional wordmark for nav and marketing. */
export function QuayLogo({ size = 28, showWordmark = true, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/quaywatch-icon.png"
        alt=""
        width={size}
        height={size}
        className="rounded-sm ring-1 ring-signal-teal/30"
        priority
      />
      {showWordmark ? (
        <span className="font-display text-sm font-bold uppercase tracking-[0.14em] text-manifest-100">
          Quay<span className="text-signal-teal">watch</span>
        </span>
      ) : null}
    </span>
  );
}
