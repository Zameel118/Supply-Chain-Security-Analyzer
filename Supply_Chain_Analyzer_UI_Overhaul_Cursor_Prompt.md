# Cursor AI Prompt — UI Overhaul: "Inspection Console" Design System

Paste this into Cursor's Agent/Composer chat. Work through it in the phases below, in order — confirm each phase renders correctly (`npm run dev`) before starting the next. Do not attempt everything in a single pass; a UI rewrite done all at once is where Cursor tends to produce inconsistent, half-applied styling.

---

## DESIGN BRIEF — read this fully before writing any code

We are replacing the current generic dashboard look (default Tailwind slate colors, plain rounded-corner cards, stock bar charts) with a distinctive visual identity called **"Inspection Console."** The concept: a dependency tree is a shipping manifest, a vulnerability finding is a flagged crate, a clean scan is a stamped and cleared shipment. Every design decision below exists to make that metaphor real, not just decorative.

### Design tokens — add these exactly

In `tailwind.config.js`, replace the existing `colors` block with:
```js
colors: {
  ink: {
    950: "#0B1420",
    800: "#13233A",
    700: "#1B2E48",
  },
  manifest: {
    100: "#E8E2D0",
    200: "#DCD4BC",
  },
  signal: {
    teal: "#2DD4BF",
    tealDim: "#14B8A6",
  },
  stamp: {
    amber: "#F0A93F",
    red: "#E14B4B",
    slate: "#7C8CA6",
  },
},
fontFamily: {
  display: ["var(--font-plex-condensed)", "sans-serif"],
  sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
  mono: ["var(--font-plex-mono)", "monospace"],
},
```

### Typography

Load IBM Plex Sans, IBM Plex Sans Condensed, and IBM Plex Mono via `next/font/google` in `app/layout.tsx` (not a CDN link tag — use Next's font optimization). Expose them as CSS variables (`--font-plex-sans`, `--font-plex-condensed`, `--font-plex-mono`) matching the Tailwind config above.

Usage rules to apply everywhere in this rewrite:
- **Every** numeric/technical value — package versions, CVE IDs, hashes, timestamps, counts — renders in `font-mono`, never the default sans. This is a hard rule, not a suggestion; it's what makes the UI read as a real data tool instead of a mockup.
- Page and section headers use `font-display`, uppercase, `tracking-wide` (letter-spacing), bold weight.
- Body copy, buttons, labels use `font-sans`.

### The signature element: the Inspection Stamp

Every severity badge in the app (findings table, scan summary cards, dashboard status) must be rebuilt as a `<StampBadge>` component, not a plain colored `<span>` pill. Requirements:
- Rectangular or circular badge with a 1.5–2px border in the severity color, background transparent or near-transparent tint of that color, text in the severity color, `font-display uppercase tracking-wide`.
- Randomized slight rotation per instance, in the range −4deg to 3deg (use the finding's id string to derive a deterministic pseudo-random value, so it's stable across re-renders rather than re-randomizing every paint).
- A subtle inked/grain texture — a low-opacity SVG noise filter or repeating-radial-gradient overlay is enough; keep it subtle, not cartoonish.
- Text content by severity: critical → "CRITICAL — HOLD", high → "FLAGGED — HIGH", medium → "FLAGGED — MEDIUM", low → "NOTED — LOW", and a clean scan / zero findings state → "CLEARED".
- Build this once as a shared component (`components/StampBadge.tsx`) and use it everywhere severity appears — findings table, scan summary cards, the dependency graph node coloring, the security score badge.

### Motion: the Checkpoint Belt

Replace the current scan-progress UI (`ScanStatusPoller.tsx`) with a horizontal checkpoint sequence: Parsing → Vulnerabilities → Typosquats → Dependency Confusion → CI/CD → Secrets → Licenses. Each checkpoint is a small labeled node connected by a line; as the backend reports progress (poll `/api/scans/{id}` — if the status payload doesn't yet expose per-phase progress, add a `current_phase` field to the `Scan` model and update it from the Celery task as each service runs), the line fills and the checkpoint lights up in `signal-teal`, with a brief pulse animation on the currently-active checkpoint. Respect `prefers-reduced-motion` — fall back to an instant state change, no pulse, if set.

### Layout concept

- **Landing page (`app/page.tsx`)**: hero is not a centered headline + CTA + screenshot template. Build a live-looking mock manifest strip — a horizontal scrolling/ticking readout of fake-but-realistic package entries being "stamped" (CLEARED / FLAGGED) in real time using CSS animation, with the headline and "Sign in with GitHub" CTA overlaid on top. This demonstrates the product's actual output before the user even logs in.
- **Dashboard (`app/dashboard/page.tsx`)**: left rail navigation (icon + label, collapsible). Top status strip showing queued/running/complete scan counts, styled like an airport departure board — monospace, high information density, subtle scan-line texture. Below that, the scan submission form and scan history list.
- **Scan detail (`app/scans/[id]/page.tsx`)**: summary cards across the top (dependency count, findings by severity — each using StampBadge). Below: a two-column layout — dependency graph panel (left, using the existing `@xyflow/react` setup, restyled with ink/signal-teal color scheme and StampBadge-colored nodes) and severity breakdown chart (right). Findings render as a "manifest ledger" table: monospace columns for package/version, StampBadge for severity, expandable row for description/remediation — not a plain data table with default borders.

### Chart restyling (Recharts)

Rebuild `SeverityChart.tsx` and any other chart component with:
- No default Recharts grid/axis colors — use `ink-700` for gridlines at low opacity, `manifest-100` at 60% opacity for axis text (not slate-400).
- Bars/segments colored by severity using the `stamp` palette, not arbitrary chart colors.
- Custom tooltip component matching the ink/mono aesthetic — remove the default white Recharts tooltip entirely.
- Add a second chart: a small sparkline/trend line component (`components/TrendSparkline.tsx`) showing finding count across a user's last N scans of the same repo, monospace-labeled, teal line on transparent background — this is new, supports the scan-history/regression feature below.

---

## BUILD PHASES

### Phase A — Design system foundation
- Update `tailwind.config.js` and font loading as specified above.
- Build `components/StampBadge.tsx` per spec.
- Build a shared `components/Panel.tsx` (replaces ad hoc `<div className="rounded-lg bg-slate-panel ...">` patterns) and `components/Button.tsx` (primary = signal-teal fill, secondary = outlined) so every screen shares one set of primitives instead of repeating utility classes.
- Do not touch page layouts yet — just get the primitives right and visually confirm `StampBadge` in isolation (temporarily render a few on the homepage to check rotation/texture/color before wiring it into real data).

### Phase B — Global shell
- Rebuild `NavBar.tsx` with the new type/color system.
- Rebuild `app/layout.tsx` background (ink-950 base, subtle vignette or grain texture — keep restrained, not busy) and font variables.
- Rebuild `app/page.tsx` landing hero with the manifest-strip concept described above.

### Phase C — Dashboard
- Rebuild `app/dashboard/page.tsx` with the airport-board status strip and left rail nav.
- Rebuild `ScanForm.tsx` and `ScanHistory.tsx` using `Panel`/`Button` primitives.
- Rebuild `ScanStatusPoller.tsx` into the Checkpoint Belt component described above. This requires a small backend change — add `current_phase` to the `Scan` model/schema and update it from `scan_tasks.py` at the start of each analysis step. Do this backend change first, confirm it via `/api/scans/{id}` response, then wire the frontend to it.

### Phase D — Scan detail page
- Rebuild `app/scans/[id]/page.tsx` two-column layout as specified.
- Restyle `DependencyGraph.tsx` nodes/edges with the ink/signal-teal palette and StampBadge-consistent severity coloring.
- Rebuild `SeverityChart.tsx` per the chart restyling spec.
- Rebuild the findings table into the "manifest ledger" style (monospace columns, expandable rows).
- Add `components/TrendSparkline.tsx` and wire it to scan history for the same repo.

### Phase E — New features (build these three now)
1. **Shareable public report link.** Add a `public_share_token` field to `Scan` (nullable, generated on request), a toggle in the scan detail UI ("Make this report public"), and a new unauthenticated route `app/report/[token]/page.tsx` that renders a read-only version of the scan detail page (reuse the same components, hide the nav rail and any account-specific UI). Add a way to revoke it (regenerate/null the token).
2. **Embeddable security score badge.** Add a backend endpoint `GET /api/scans/{id}/badge.svg` that returns a small SVG badge (styled consistent with StampBadge — same ink/signal-teal look, not a generic shields.io clone) showing overall status (e.g. "3 CRITICAL" or "CLEARED"). Show the embed snippet (Markdown image + link) on the scan detail page next to the share-link toggle.
3. **Scan diff / regression detection.** When a new scan completes for a repo the user has scanned before, compute the set difference in findings (by dependency + finding type) against the immediately prior scan, and store/display which findings are new since last scan vs previously known vs resolved since last scan. Surface this as a small "Since last scan: +2 new, 1 resolved" line on the scan detail page, using `stamp-red`/`signal-teal` for new/resolved respectively.

### Phase F — Polish pass
- Full responsive check down to mobile width (375px) — the two-column scan detail layout should stack, the checkpoint belt should wrap or scroll horizontally rather than compress unreadably.
- Verify visible keyboard focus states on every interactive element (the default Tailwind focus ring is fine if it's recolored to `signal-teal`, don't remove focus outlines).
- Verify `prefers-reduced-motion` is respected on the checkpoint pulse, hero ticker, and any hover transitions.
- Take a pass through every screen and remove one thing — check for any leftover default-Tailwind-looking element (plain gray card, default shadow, unstyled table) that slipped through and doesn't match the rest.

---

## WORKING STYLE
- After each phase, tell me exactly what to look at (`npm run dev`, which URL) before we move to the next.
- If a design decision in this brief doesn't translate cleanly to a real component (e.g. the manifest-strip hero), make a reasonable implementation choice and tell me what you chose and why, rather than asking me to specify pixel-level detail — I'm not a designer, describe the tradeoff in plain terms.
- Keep every new component in `frontend/components/`, named clearly, and reused across pages — don't duplicate the StampBadge or Panel styling inline in multiple files.
