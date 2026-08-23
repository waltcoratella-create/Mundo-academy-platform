"use client";

import { useId } from "react";
import { ShoppingCart, UserPlus, MousePointerClick, Megaphone } from "lucide-react";
import type { AdPlatform, CampaignDraft, CampaignObjective, Errors } from "../campaign-types";
import { OBJECTIVE_OPTIONS, PLATFORM_OPTIONS } from "../campaign-types";

/**
 * Step 1 · Campaign — laid out to the Whop Ads build spec.
 *
 * Section pattern: label (16/500, red asterisk when required) → optional
 * description (14/400) → control, blocks separated by 32px. Platform and
 * objective are selection cards (radius 16); the title uses the fui size-3
 * TextField (40px, radius 10).
 *
 * Daily budget stays in the wizard's own Presupuesto step — see the note in
 * CampaignWizard. Nothing here touches Build or Creatives.
 */

const ICONS: Record<CampaignObjective, React.ElementType> = {
  sales: ShoppingCart,
  leads: UserPlus,
  traffic: MousePointerClick,
  awareness: Megaphone,
};

/** Monochrome glyphs standing in for each network's mark. */
const PLATFORM_GLYPH: Record<AdPlatform, string> = {
  meta: "∞",
  tiktok: "♪",
  google: "A",
  x: "✕",
};

function Section({
  label,
  required,
  description,
  error,
  isField,
  labelFor,
  children,
}: {
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  isField?: boolean;
  labelFor?: string;
  children: React.ReactNode;
}) {
  const labelId = `${labelFor ?? label}-label`;
  return (
    <div className="w-section" data-field={isField ? "true" : undefined}>
      <div className="w-head">
        {labelFor ? (
          <label className="w-label" htmlFor={labelFor}>
            {label} {required && <span className="w-req" aria-hidden="true">*</span>}
          </label>
        ) : (
          <span className="w-label" id={labelId}>
            {label} {required && <span className="w-req" aria-hidden="true">*</span>}
          </span>
        )}
        {description && <span className="w-desc">{description}</span>}
      </div>
      {children}
      {error && <span className="w-error" role="alert">{error}</span>}
    </div>
  );
}

export function StepObjective({
  draft,
  errors,
  onChange,
}: {
  draft: CampaignDraft;
  errors: Errors;
  onChange: (patch: Partial<CampaignDraft>) => void;
}) {
  const nameId = useId();

  return (
    <div className="w-sections">
      {/* ── Platform ── */}
      <Section
        label="Plataforma"
        required
        description="Solo Meta está disponible por ahora."
      >
        <div className="w-platgrid" role="radiogroup" aria-label="Plataforma">
          {PLATFORM_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={draft.platform === p.value}
              aria-label={p.label}
              className="w-plat"
              disabled={!p.available}
              title={p.available ? p.label : `${p.label} — no disponible todavía`}
              onClick={() => onChange({ platform: p.value })}
            >
              <span className="w-plat__glyph" aria-hidden="true">{PLATFORM_GLYPH[p.value]}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Objective ── */}
      <Section
        label="Objetivo de campaña"
        required
        description="Qué quieres conseguir con esta campaña."
        error={errors.objective}
      >
        <div className="w-objgrid" role="radiogroup" aria-label="Objetivo de campaña">
          {OBJECTIVE_OPTIONS.map((o) => {
            const Icon = ICONS[o.value];
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={draft.objective === o.value}
                className="w-obj"
                style={
                  {
                    "--w-obj-accent": o.accent,
                    "--w-obj-tint": o.tint,
                    "--w-obj-icon-bg": o.iconBg,
                  } as React.CSSProperties
                }
                onClick={() => onChange({ objective: o.value })}
              >
                <span className="w-obj__icon">
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                </span>
                {/* Icon + label only — the reference card carries no description,
                    which is what keeps it at the spec's 102px height. */}
                <span className="w-obj__name">{o.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Title ── */}
      <Section label="Título de campaña" required isField labelFor={nameId} error={errors.name}>
        <input
          id={nameId}
          type="text"
          className="w-input"
          value={draft.name}
          maxLength={120}
          placeholder="campaña Ventas"
          aria-invalid={errors.name ? true : undefined}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </Section>
    </div>
  );
}
