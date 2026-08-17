"use client";

import { useState } from "react";
import { AnimatePresence, m, useReducedMotion, type Variants } from "motion/react";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Switch } from "@astryxdesign/core/Switch";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Badge } from "@astryxdesign/core/Badge";
import { fadeUp, popoverScale, sheetFromBottom, transitions } from "@/lib/motion";

/** One labeled section, consistent rhythm — not a card, per the containment rules this page itself demonstrates. */
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-hairline pt-6">
      <h2 className="text-sm font-semibold text-ink-primary">{title}</h2>
      {description ? <p className="mt-1 max-w-[70ch] text-sm text-ink-secondary">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** What every preset above collapses to when reduced motion is simulated — an instant crossfade, matching MotionConfig's own documented `reducedMotion="user"` behavior. */
const reducedMotionFade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitions.instant },
  exit: { opacity: 0, transition: transitions.instant },
};

function Swatch({ label, token, className }: { label: string; token: string; className: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 shrink-0 rounded-md border border-hairline ${className}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-sm text-ink-primary">{label}</p>
        <p className="truncate font-mono text-xs text-ink-muted">{token}</p>
      </div>
    </div>
  );
}

export function DesignSystemClient() {
  const [defaultValue, setDefaultValue] = useState("");
  const [switchOn, setSwitchOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [simulateReducedMotion, setSimulateReducedMotion] = useState(false);
  const osReducedMotion = useReducedMotion();

  return (
    <div className="space-y-10">
      {/* ---------- Colors ---------- */}
      <Section
        title="Colors"
        description="Canvas, surfaces, separators, text roles, action roles (never cyan), measurement, and status — every documented pairing here passes WCAG 2.2 AA (see docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_PHASE_1_IMPLEMENTATION.md for the computed ratios)."
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Swatch label="Ground (canvas)" token="--color-ground" className="bg-ground" />
          <Swatch label="Surface raised" token="--color-surface-raised" className="bg-surface-raised" />
          <Swatch label="Surface lifted" token="--color-surface-lifted" className="bg-surface-lifted" />
          <Swatch label="Surface sidebar" token="--color-surface-sidebar" className="bg-surface-sidebar" />
          <Swatch label="Hairline" token="--color-hairline" className="bg-hairline" />
          <Swatch label="Ink primary" token="--color-ink-primary" className="bg-ink-primary" />
          <Swatch label="Ink secondary" token="--color-ink-secondary" className="bg-ink-secondary" />
          <Swatch label="Ink muted (floor)" token="--color-ink-muted" className="bg-ink-muted" />
          <Swatch label="Action (not cyan)" token="--color-action" className="bg-action" />
          <Swatch label="Action hover" token="--color-action-hover" className="bg-action-hover" />
          <Swatch label="Action quiet" token="--color-action-quiet-bg" className="bg-action-quiet-bg border-2" />
          <Swatch label="Instrument (measurement only)" token="--color-instrument" className="bg-instrument" />
          <Swatch label="Signal blue (structure/focus)" token="--color-signal-blue" className="bg-signal-blue" />
          <Swatch label="Success" token="--color-confirm" className="bg-confirm" />
          <Swatch label="Caution" token="--color-caution" className="bg-caution" />
          <Swatch label="Danger" token="--color-danger" className="bg-danger" />
          <Swatch label="Info" token="--color-info" className="bg-info" />
        </div>
      </Section>

      {/* ---------- Typography ---------- */}
      <Section
        title="Typography"
        description="IBM Plex Sans Variable, self-hosted. Seven semantic roles — weight and spacing carry hierarchy before size does."
      >
        <div className="space-y-3">
          <p className="text-2xl font-semibold text-ink-primary">Display — page identity, one per screen</p>
          <p className="text-lg font-semibold text-ink-primary">Heading — section headings</p>
          <p className="text-base font-semibold text-ink-primary">Subheading — dialog/card titles</p>
          <p className="text-sm font-semibold text-ink-primary">Title — panel headers, table column heads</p>
          <p className="text-sm text-ink-secondary">
            Body — the workhorse and default for reading. Cap measured prose at 65–75ch so a long
            line of operational copy stays easy to track, the way this sentence demonstrates by
            running long enough to actually wrap.
          </p>
          <p className="text-xs text-ink-secondary">Small — compact secondary text, captions</p>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Label / metadata — badges, timestamps, table headers
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline pt-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-ink-muted">Money (tabular)</p>
            <p className="text-lg font-semibold tabular-nums text-ink-primary">$12,840.00</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Measurement (readout — hero exception)</p>
            <p className="text-2xl font-semibold tabular-nums text-instrument">28,406 sq ft</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Percentage (tabular)</p>
            <p className="text-lg font-semibold tabular-nums text-ink-primary">12.5%</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Date/time (tabular)</p>
            <p className="text-lg font-semibold tabular-nums text-ink-primary">Aug 14 · 8:00 AM</p>
          </div>
        </div>
      </Section>

      {/* ---------- Spacing ---------- */}
      <Section title="Spacing" description="4px base unit — Tailwind's own scale, unchanged. No new tokens needed.">
        <div className="space-y-2">
          {[1, 2, 3, 4, 6, 8, 10, 12].map((step) => (
            <div key={step} className="flex items-center gap-3">
              <span className="w-16 shrink-0 font-mono text-xs text-ink-muted">
                {step * 4}px
              </span>
              <div className="bg-instrument/40" style={{ width: `${step * 4}px`, height: "12px" }} />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          Control heights: dense 32px (<code>h-8</code>) · standard 40px (<code>h-10</code>) · mobile/field minimum 44px (<code>h-11</code>).
        </p>
      </Section>

      {/* ---------- Radius ---------- */}
      <Section
        title="Radius"
        description="Compact, standard, framed-tool — moved down from the old large-card scale. Pill only for statuses/tags/circular controls."
      >
        <div className="flex flex-wrap items-end gap-6">
          {[
            { label: "none", cls: "rounded-none" },
            { label: "compact (4px)", cls: "rounded-sm" },
            { label: "standard (6px)", cls: "rounded-md" },
            { label: "framed-tool (8px max)", cls: "rounded-lg" },
            { label: "pill", cls: "rounded-full" },
          ].map((r) => (
            <div key={r.label} className="text-center">
              <div className={`h-14 w-14 border border-hairline bg-surface-raised ${r.cls}`} />
              <p className="mt-1.5 text-xs text-ink-muted">{r.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- Materials ---------- */}
      <Section
        title="Materials"
        description="Ground → raised → lifted, tone only. Shadow is restored for exactly one case — a genuinely floating element — never for panels in normal page flow."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-hairline bg-ground p-4">
            <p className="text-xs text-ink-muted">Ground</p>
          </div>
          <div className="rounded-md border border-hairline bg-surface-raised p-4">
            <p className="text-xs text-ink-muted">Raised</p>
          </div>
          <div className="rounded-md border border-hairline bg-surface-lifted p-4">
            <p className="text-xs text-ink-muted">Lifted</p>
          </div>
          <div
            className="rounded-md border border-hairline bg-surface-raised p-4"
            style={{ boxShadow: "var(--shadow-med)" }}
          >
            <p className="text-xs text-ink-muted">Overlay (shadow-med — floating only)</p>
          </div>
        </div>
      </Section>

      {/* ---------- Controls / states — Astryx primitives consuming the same tokens ---------- */}
      <Section
        title="Controls and states"
        description="Real Astryx primitives, themed through lib/astryx/theme.ts — not a Phase 3 primitive library, just proof the two systems agree."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button label="Primary" variant="primary" />
          <Button label="Secondary" variant="secondary" />
          <Button label="Ghost" variant="ghost" />
          <Button label="Destructive" variant="destructive" />
          <Button label="Disabled" variant="primary" isDisabled />
          <Button label="Loading" variant="primary" isLoading />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput label="Default" placeholder="Client name" value={defaultValue} onChange={setDefaultValue} />
          <TextInput label="Success" value="Verified" status={{ type: "success", message: "Looks good." }} />
          <TextInput
            label="Warning"
            value="482"
            status={{ type: "warning", message: "Unusually high for this trade." }}
          />
          <TextInput label="Error" value="" status={{ type: "error", message: "Required to send the quote." }} />
          <TextInput label="Disabled" value="Locked" isDisabled disabledMessage="Needs the Editor role." />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <Switch label="Notify on approval" value={switchOn} onChange={setSwitchOn} />
          <CheckboxInput label="Send a copy to the office" value={checked} onChange={setChecked} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <StatusDot variant="success" label="Paid" />
          <StatusDot variant="warning" label="Pending" />
          <StatusDot variant="error" label="Overdue" />
          <StatusDot variant="accent" label="Selected" />
          <StatusDot variant="neutral" label="Draft" isPulsing />
          <Badge label="Quoted" variant="neutral" />
        </div>

        <div className="mt-6 max-w-sm space-y-3">
          <ProgressBar value={68} max={100} variant="accent" label="Roof model — processing" />
          <div className="flex items-center gap-3">
            <Skeleton width={40} height={40} radius={2} />
            <div className="flex-1 space-y-2">
              <Skeleton width="60%" height={12} />
              <Skeleton width="40%" height={12} />
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- Motion ---------- */}
      <Section
        title="Motion"
        description="CSS owns hover/focus/pressed feedback. Motion (motion/react) owns presence, layout, sheets, popovers — semantic presets from lib/motion.ts, never a raw duration in a component."
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-md border border-hairline bg-surface-raised px-3 py-1.5 text-sm text-ink-secondary transition-colors motion-reduce:transition-none hover:bg-surface-lifted hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            CSS hover/focus (try tabbing here)
          </button>

          <button
            type="button"
            onClick={() => setShowPanel((v) => !v)}
            className="rounded-md bg-action px-3 py-1.5 text-sm font-medium text-on-action hover:bg-action-hover active:bg-action-active"
          >
            {showPanel ? "Hide" : "Show"} Motion popover
          </button>

          <button
            type="button"
            onClick={() => setShowSheet(true)}
            className="rounded-md border border-hairline bg-surface-raised px-3 py-1.5 text-sm text-ink-secondary hover:bg-surface-lifted"
          >
            Open Motion sheet
          </button>

          <label className="ml-2 flex items-center gap-2 text-xs text-ink-muted">
            <input
              type="checkbox"
              checked={simulateReducedMotion}
              onChange={(e) => setSimulateReducedMotion(e.target.checked)}
            />
            Simulate reduced motion
          </label>
        </div>

        <p className="mt-2 text-xs text-ink-muted">
          Your OS reduced-motion preference right now: <strong>{osReducedMotion ? "reduced" : "normal"}</strong>. The
          checkbox above simulates the reduced state locally without needing to change an OS setting — both paths
          resolve through the same <code>MotionProvider</code> (<code>MotionConfig reducedMotion=&quot;user&quot;</code>).
        </p>

        <div className="relative mt-4 h-24">
          <AnimatePresence>
            {showPanel ? (
              <m.div
                variants={simulateReducedMotion ? reducedMotionFade : popoverScale}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute left-0 top-0 rounded-md border border-hairline bg-surface-raised p-4 text-sm text-ink-primary"
                style={{ boxShadow: "var(--shadow-med)" }}
              >
                A popover using the <code>popoverScale</code> preset (or an instant crossfade when reduced motion is
                simulated).
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showSheet ? (
            <div className="fixed inset-0 z-50" role="presentation">
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transitions.exit}
                className="absolute inset-0 bg-ground/70"
                onClick={() => setShowSheet(false)}
              />
              <m.div
                role="dialog"
                aria-modal="true"
                aria-label="Motion sheet demo"
                variants={simulateReducedMotion ? reducedMotionFade : sheetFromBottom}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute inset-x-0 bottom-0 rounded-t-lg border-t border-hairline bg-surface-sidebar p-6"
                style={{ boxShadow: "var(--shadow-high)" }}
              >
                <p className="text-sm text-ink-primary">
                  The <code>sheetFromBottom</code> preset — the same pattern validated live in the Phase 0
                  prototype&apos;s mobile inspector, now backed by Motion instead of a hand-rolled CSS transition.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSheet(false)}
                  className="mt-4 rounded-md bg-action px-3 py-1.5 text-sm font-medium text-on-action"
                >
                  Close
                </button>
              </m.div>
            </div>
          ) : null}
        </AnimatePresence>

        {/* Demonstrates the fadeUp preset directly, always-mounted so it doesn't need a trigger. */}
        <m.p variants={fadeUp} initial="initial" animate="animate" className="mt-6 text-xs text-ink-muted">
          (This line faded up on mount using the <code>fadeUp</code> preset.)
        </m.p>
      </Section>

      {/* ---------- Document tokens ---------- */}
      <Section
        title="Document tokens"
        description="Not a public-document redesign — Phase 6 migrates the actual routes. This proves the paper/ink/rule/contractor-brand-slot foundation already exists and is untouched."
      >
        <div className="surface-light max-w-md rounded-md border border-hairline p-5" style={{ background: "var(--color-paper-document)" }}>
          <div className="flex h-10 w-40 items-center justify-start rounded border border-dashed border-paper-rule px-2 text-xs text-paper-ink-faint">
            Contractor logo slot
          </div>
          <p className="mt-4 text-sm font-semibold" style={{ color: "var(--color-paper-ink)" }}>
            Sample Roofing Co. — Quote #482
          </p>
          <div className="mt-3 border-t" style={{ borderColor: "var(--color-paper-rule)" }} />
          <div className="mt-2 flex justify-between text-sm" style={{ color: "var(--color-paper-ink-body)" }}>
            <span>Subtotal</span>
            <span className="tabular-nums">$12,840.00</span>
          </div>
          <div className="mt-2 border-t-2 pt-2" style={{ borderColor: "var(--color-paper-rule-strong)" }}>
            <div className="flex justify-between text-sm font-semibold" style={{ color: "var(--color-paper-ink)" }}>
              <span>Total</span>
              <span className="tabular-nums">$12,840.00</span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
