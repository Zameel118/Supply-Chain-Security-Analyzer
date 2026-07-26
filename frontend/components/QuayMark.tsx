type Props = {
  size?: number;
  className?: string;
};

/**
 * Radar-ring Q mark: navy field, teal rings, cream Q, amber beacon.
 * Inline SVG so nav/favicon-adjacent UI stays crisp and tiny.
 */
export function QuayMark({ size = 28, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="64" height="64" rx="4" fill="#0B1420" />
      <path
        d="M32 6.5a25.5 25.5 0 1 1-18.04 7.46"
        stroke="#2DD4BF"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M32 13a19 19 0 1 1-13.44 5.56"
        stroke="#2DD4BF"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M32 19.5a12.5 12.5 0 1 1-8.84 3.66"
        stroke="#2DD4BF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="32" cy="30" r="10.5" stroke="#E8E2D0" strokeWidth="3.4" />
      <circle cx="32" cy="28.5" r="3.4" fill="#F0A93F" />
      <path
        d="M38.2 36.4 48 46.2"
        stroke="#E8E2D0"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <circle cx="48" cy="46.2" r="2.4" fill="#2DD4BF" />
    </svg>
  );
}
