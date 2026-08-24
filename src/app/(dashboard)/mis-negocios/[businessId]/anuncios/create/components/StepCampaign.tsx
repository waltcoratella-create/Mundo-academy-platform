"use client";

import { useId, useState } from "react";
import {
  ShoppingCart, UserPlus, Heart, MousePointerClick, Megaphone, ChevronDown,
} from "lucide-react";
import type {
  CampaignDelivery, CampaignDraft, CampaignObjective, Errors,
} from "../campaign-types";
import {
  OBJECTIVE_OPTIONS, PLATFORM_OPTIONS, BUDGET_PRESETS,
  BUDGET_CONTROL_OPTIONS, BID_STRATEGY_OPTIONS, SPECIAL_CATEGORY_OPTIONS,
} from "../campaign-types";

/**
 * Campaign — the first phase, laid out to the Whop Ads build spec.
 *
 * Order matches the reference: platform → objective → title → daily budget
 * (with presets) → advanced options. Section pattern is label (16/500, red
 * asterisk when required) → optional description (14/400) → control, blocks
 * separated by 32px.
 *
 * Platform marks are real brand SVGs from /public/brands/ads, tinted with a CSS
 * mask so each keeps its official colour and dims when unavailable.
 */

const ICONS: Record<CampaignObjective, React.ElementType> = {
  sales: ShoppingCart,
  leads: UserPlus,
  engagement: Heart,
  traffic: MousePointerClick,
  awareness: Megaphone,
};

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$", EUR: "€", MXN: "$", ARS: "$", COP: "$", CLP: "$", BRL: "R$",
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
  return (
    <div className="w-section" data-field={isField ? "true" : undefined}>
      <div className="w-head">
        {labelFor ? (
          <label className="w-label" htmlFor={labelFor}>
            {label} {required && <span className="w-req" aria-hidden="true">*</span>}
          </label>
        ) : (
          <span className="w-label">
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

function AdvancedRow({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="w-advrow">
      <div className="w-advrow__text">
        <label className="w-advrow__label" htmlFor={id}>{label}</label>
        <span className="w-advrow__desc">{description}</span>
      </div>
      <select
        id={id}
        className="w-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function StepCampaign({
  draft,
  errors,
  onChange,
}: {
  draft: CampaignDraft;
  errors: Errors;
  onChange: (patch: Partial<CampaignDraft>) => void;
}) {
  const nameId = useId();
  const budgetId = useId();
  const advancedId = useId();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const symbol = CURRENCY_SYMBOL[draft.currency] ?? draft.currency;

  /** Advanced options are delivery settings — same jsonb as Build's. */
  function patchAdvanced(patch: Partial<CampaignDelivery>) {
    onChange({ delivery: { ...draft.delivery, ...patch } });
  }

  return (
    <div className="w-sections">
      {/* ── 1 · Platform ── */}
      <Section
        label="Plataforma"
        required
        description="Solo Meta está disponible por ahora."
        error={errors.platform}
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
              <span
                className="w-plat__logo"
                aria-hidden="true"
                style={
                  {
                    "--brand": p.brand,
                    "--mask": `url(/brands/ads/${p.icon})`,
                  } as React.CSSProperties
                }
              />
            </button>
          ))}
        </div>
      </Section>

      {/* ── 2 · Objective ── */}
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
                data-solid={o.iconSolid ? "true" : undefined}
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
                <span className="w-obj__name">{o.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── 3 · Title ── */}
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

      {/* ── 4 · Daily budget + presets ── */}
      <Section
        label="Presupuesto diario"
        required
        isField
        labelFor={budgetId}
        error={errors.budgetAmount}
      >
        <div className="w-inputwrap" data-invalid={errors.budgetAmount ? "true" : undefined}>
          <span className="w-affix" aria-hidden="true">{symbol}</span>
          <input
            id={budgetId}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className="w-input w-input--affixed"
            value={draft.budgetAmount}
            placeholder="200"
            aria-invalid={errors.budgetAmount ? true : undefined}
            onChange={(e) => onChange({ budgetAmount: e.target.value, budgetType: "daily" })}
          />
          <span className="w-affix w-affix--suffix" aria-hidden="true">/día</span>
        </div>

        <div className="w-chips" role="group" aria-label="Presupuestos sugeridos">
          {BUDGET_PRESETS.map((p) => {
            const selected = Number(draft.budgetAmount) === p;
            return (
              <button
                key={p}
                type="button"
                className="w-chip"
                aria-pressed={selected}
                onClick={() => onChange({ budgetAmount: String(p), budgetType: "daily" })}
              >
                {symbol}{p}/día
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── 5 · Advanced options ── */}
      <div className="w-section">
        <button
          type="button"
          className="w-advtoggle"
          aria-expanded={advancedOpen}
          aria-controls={advancedId}
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <ChevronDown className="w-advtoggle__chev" size={18} strokeWidth={2} aria-hidden="true" />
          Opciones avanzadas
        </button>

        {advancedOpen && (
          <div className="w-advpanel" id={advancedId}>
            <AdvancedRow
              label="Control de presupuesto"
              description="Dónde se administra el gasto de la campaña."
              value={draft.delivery.budgetControl}
              options={BUDGET_CONTROL_OPTIONS}
              onChange={(budgetControl) => patchAdvanced({ budgetControl })}
            />
            <AdvancedRow
              label="Estrategia de puja"
              description="Cómo se optimiza la entrega de tus anuncios."
              value={draft.delivery.bidStrategy}
              options={BID_STRATEGY_OPTIONS}
              onChange={(bidStrategy) => patchAdvanced({ bidStrategy })}
            />
            <AdvancedRow
              label="Categoría de anuncio especial"
              description="Obligatorio para crédito, empleo, vivienda o temas sociales."
              value={draft.delivery.specialCategory}
              options={SPECIAL_CATEGORY_OPTIONS}
              onChange={(specialCategory) => patchAdvanced({ specialCategory })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
