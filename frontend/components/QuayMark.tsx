type Props = {
  size?: number;
  className?: string;
};

/** Shield + chain link — industrial security mark (amber / steel blue). */
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
      <defs>
        <linearGradient id="qw-scan" x1="8" y1="32" x2="56" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#3B82F6" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="8" fill="#121A24" />
      <path
        d="M6 14 L14 6 H26 L32 12 L38 6 H50 L58 14 V22"
        stroke="#F59E0B"
        strokeWidth="1.2"
        strokeOpacity="0.35"
      />
      <path
        d="M32 9 L50 17 V31.5 C50 42.5 32 52 32 52 C32 52 14 42.5 14 31.5 V17 L32 9Z"
        fill="rgba(59,130,246,0.14)"
        stroke="#3B82F6"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M22 34.5a6.2 6.2 0 0 1 10.8-4.2 6.2 6.2 0 0 1 8.4 8.4 6.2 6.2 0 0 1-10.8 4.2 6.2 6.2 0 0 1-8.4-8.4Z"
        stroke="#F59E0B"
        strokeWidth="2.6"
      />
      <path
        d="M34 34.5a5 5 0 0 1 8.6-3.4 5 5 0 0 1 6.8 6.8 5 5 0 0 1-8.6 3.4 5 5 0 0 1-6.8-6.8Z"
        stroke="#FBBF24"
        strokeWidth="2.2"
      />
      <path d="M11 33 H53" stroke="url(#qw-scan)" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
      <circle cx="32" cy="33" r="2.2" fill="#38BDF8" />
      <path
        d="M32 20 V26 M26 23 H38"
        stroke="#E8ECF4"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
