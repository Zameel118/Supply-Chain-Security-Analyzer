"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const TOUR_KEY = "quaywatch_tour_seen";
const TARGET_CLASS = "quay-tour-target";

type Step = {
  id: string;
  target: string;
  title: string;
  body: string;
  placement: "top" | "bottom" | "left" | "right";
  action?: { label: string; type: string };
};

const STEPS: Step[] = [
  {
    id: "welcome",
    target: "brand",
    title: "Welcome to Quaywatch",
    body: "This ops console inspects GitHub repos like a dockside consignment check. Follow the highlights. You can skip anytime.",
    placement: "bottom",
  },
  {
    id: "channel",
    target: "channel",
    title: "Live channel strip",
    body: "ACTIVE and CLEARED counters refresh every few seconds so you always know what is on the belt.",
    placement: "right",
  },
  {
    id: "board",
    target: "board",
    title: "Berth status board",
    body: "Queued, running, cleared, and hold counts update live. Bars show relative load across berths.",
    placement: "bottom",
  },
  {
    id: "inspect",
    target: "inspect",
    title: "Start an inspection",
    body: "Paste a GitHub URL or pick one of your repos. Choose commercial or open-source policy, then queue the job.",
    placement: "right",
  },
  {
    id: "feed",
    target: "feed",
    title: "Live action feed",
    body: "Every berth lifecycle event streams here. Click a row to open that inspection ledger.",
    placement: "left",
  },
  {
    id: "risk",
    target: "risk",
    title: "Risk pulse",
    body: "Severity mix across your recent complete scans. Use it to spot repos that keep shipping critical holds.",
    placement: "left",
  },
  {
    id: "watch",
    target: "watch",
    title: "Watchlist",
    body: "Pin repos you care about for one-click re-inspection. Stored in this browser only.",
    placement: "top",
  },
  {
    id: "help",
    target: "help",
    title: "You are live",
    body: "Reopen this guide anytime with Tour (or press ?). Full SOP with screenshots: /guide",
    placement: "bottom",
  },
];

const PAD = 12;

function getRect(selector: string) {
  const el = document.querySelector(`[data-tour="${selector}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
    bottom: r.bottom + PAD,
    right: r.right + PAD,
    el,
  };
}

function TourDim({
  rect,
  onDismiss,
}: {
  rect: ReturnType<typeof getRect>;
  onDismiss: () => void;
}) {
  const shade = "fixed z-[200] bg-ink-950/90 backdrop-blur-[3px]";
  if (!rect) {
    return <button type="button" className={`fixed inset-0 ${shade}`} onClick={onDismiss} aria-label="Close tour" />;
  }
  const { top, left, width, height } = rect;
  const bottom = top + height;
  const right = left + width;
  return (
    <>
      <button type="button" className={`${shade} inset-x-0 top-0`} style={{ height: Math.max(0, top) }} onClick={onDismiss} aria-hidden />
      <button
        type="button"
        className={shade}
        style={{ top, left: 0, width: Math.max(0, left), height }}
        onClick={onDismiss}
        aria-hidden
      />
      <button
        type="button"
        className={shade}
        style={{ top, left: right, right: 0, height }}
        onClick={onDismiss}
        aria-hidden
      />
      <button
        type="button"
        className={shade}
        style={{ top: bottom, left: 0, right: 0, bottom: 0 }}
        onClick={onDismiss}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed z-[205] rounded-sm border-2 border-signal-teal shadow-[0_0_0_1px_rgba(56,189,248,0.45),0_0_40px_rgba(245,158,11,0.35)]"
        style={{ top, left, width, height }}
        aria-hidden
      />
    </>
  );
}

function tooltipStyle(
  rect: ReturnType<typeof getRect>,
  placement: Step["placement"],
  tipW: number,
  tipH: number,
) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 16;

  if (!rect) {
    return { top: Math.max(24, (vh - tipH) / 2), left: Math.max(16, (vw - tipW) / 2) };
  }

  const tryPlace = (p: Step["placement"]) => {
    if (p === "bottom") {
      return { top: rect.bottom + gap, left: rect.left + rect.width / 2 - tipW / 2 };
    }
    if (p === "top") {
      return { top: rect.top - tipH - gap, left: rect.left + rect.width / 2 - tipW / 2 };
    }
    if (p === "right") {
      return { top: rect.top + rect.height / 2 - tipH / 2, left: rect.right + gap };
    }
    return { top: rect.top + rect.height / 2 - tipH / 2, left: rect.left - tipW - gap };
  };

  let pos = tryPlace(placement);
  pos.left = Math.min(Math.max(12, pos.left), vw - tipW - 12);
  pos.top = Math.min(Math.max(12, pos.top), vh - tipH - 12);

  if (placement === "bottom" && rect.bottom + tipH + gap > vh - 8) {
    pos = tryPlace("top");
    pos.left = Math.min(Math.max(12, pos.left), vw - tipW - 12);
    pos.top = Math.min(Math.max(12, pos.top), vh - tipH - 12);
  }
  if (placement === "right" && rect.right + tipW + gap > vw - 8) {
    pos = tryPlace("left");
    pos.left = Math.min(Math.max(12, pos.left), vw - tipW - 12);
  }

  return pos;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onAction?: (action: { label: string; type: string }) => void | Promise<void>;
};

export function TourGuide({ open, onClose, onAction }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<ReturnType<typeof getRect>>(null);
  const [tipReady, setTipReady] = useState(false);
  const [bodyKey, setBodyKey] = useState(0);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipSize, setTipSize] = useState({ w: 360, h: 200 });
  const highlightedRef = useRef<Element | null>(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const clearHighlight = useCallback(() => {
    if (highlightedRef.current) {
      highlightedRef.current.classList.remove(TARGET_CLASS);
      highlightedRef.current = null;
    }
  }, []);

  const measure = useCallback(() => {
    if (!open || !current) return;
    clearHighlight();
    if (!current.target) {
      setRect(null);
      return;
    }
    const r = getRect(current.target);
    setRect(r);
    if (r?.el) {
      r.el.classList.add(TARGET_CLASS);
      highlightedRef.current = r.el;
      r.el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
  }, [open, current, clearHighlight]);

  useLayoutEffect(() => {
    if (!open) {
      setTipReady(false);
      return undefined;
    }
    setStep(0);
    setTipReady(false);
    const t = requestAnimationFrame(() => setTipReady(true));
    return () => cancelAnimationFrame(t);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    setBodyKey((k) => k + 1);
    setTipReady(false);

    const t0 = requestAnimationFrame(() => {
      measure();
      setTimeout(() => {
        if (tipRef.current) {
          const b = tipRef.current.getBoundingClientRect();
          setTipSize({ w: b.width, h: b.height });
        }
        setTipReady(true);
      }, 80);
    });

    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelAnimationFrame(t0);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, step, measure]);

  useEffect(() => {
    if (!open) clearHighlight();
    return () => clearHighlight();
  }, [open, clearHighlight]);

  function finish() {
    clearHighlight();
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* ignore */
    }
    onClose();
  }

  function next() {
    if (isLast) finish();
    else setStep((s) => s + 1);
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  if (!open || !current) return null;

  const tipPos = tooltipStyle(rect, current.placement || "bottom", tipSize.w, tipSize.h);

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="Product tour">
      <TourDim rect={rect} onDismiss={finish} />

      <div
        ref={tipRef}
        className={`tour-tooltip ${tipReady ? "is-ready" : "is-entering"}`}
        style={{ top: tipPos.top, left: tipPos.left }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-manifest-200/15 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-signal-cyan">
              {String(step + 1).padStart(2, "0")}/{String(STEPS.length).padStart(2, "0")}
            </span>
            <h2
              key={`title-${bodyKey}`}
              className="tour-body-fade truncate font-sans text-sm font-semibold text-manifest-100"
            >
              {current.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={finish}
            className="px-1 font-mono text-stamp-slate hover:text-signal-teal"
            aria-label="Skip tour"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3">
          <p
            key={`body-${bodyKey}`}
            className="tour-body-fade text-sm leading-relaxed text-manifest-200/90"
          >
            {current.body}
          </p>
          <div className="mt-3 flex gap-1" aria-hidden>
            {STEPS.map((_, i) => (
              <button
                key={STEPS[i].id}
                type="button"
                className={`h-1 flex-1 transition-all duration-300 ${
                  i === step
                    ? "scale-y-150 bg-signal-teal"
                    : i < step
                      ? "bg-signal-teal/40"
                      : "bg-manifest-200/15"
                }`}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-manifest-200/15 bg-ink-800/60 px-4 py-2.5">
          <button
            type="button"
            onClick={finish}
            className="font-mono text-[10px] uppercase tracking-wider text-stamp-slate hover:text-manifest-100"
          >
            Skip
          </button>
          <div className="flex flex-wrap gap-2">
            {current.action ? (
              <button
                type="button"
                onClick={() => current.action && onAction?.(current.action)}
                className="border border-signal-teal/50 px-3 py-1.5 font-mono text-xs text-signal-teal hover:bg-signal-teal/10"
              >
                {current.action.label}
              </button>
            ) : null}
            <button
              type="button"
              onClick={prev}
              disabled={step === 0}
              className="border border-manifest-200/20 px-3 py-1.5 font-mono text-xs text-manifest-100 disabled:opacity-40"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={next}
              className="bg-signal-teal px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-signal-tealDim"
            >
              {isLast ? "Finish" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldAutoShowTour(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) !== "1";
  } catch {
    return true;
  }
}
