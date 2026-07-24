"use client";

import { CalendarClock, Wallet } from "lucide-react";
import type { BudgetType, CampaignDraft, Errors } from "../campaign-types";
import { CURRENCY_OPTIONS, TIMEZONE_OPTIONS } from "../campaign-types";
import { StepHeading, TextField, SelectField, Field } from "./Field";

const BUDGET_KINDS: { value: BudgetType; label: string; description: string; icon: React.ElementType }[] = [
  { value: "daily",    label: "Presupuesto diario", description: "Se gasta cada día.",              icon: Wallet },
  { value: "lifetime", label: "Presupuesto total",  description: "Se reparte en todo el periodo.", icon: CalendarClock },
];

export function StepBudget({
  draft,
  errors,
  onChange,
}: {
  draft: CampaignDraft;
  errors: Errors;
  onChange: (patch: Partial<CampaignDraft>) => void;
}) {
  return (
    <>
      <StepHeading
        title="Presupuesto y calendario"
        hint="Cuánto quieres invertir y durante cuánto tiempo."
      />

      <div className="adsc-field">
        <span className="adsc-label" id="budget-kind-label">Tipo de presupuesto</span>
        <div className="adsc-options adsc-options-2" role="radiogroup" aria-labelledby="budget-kind-label">
          {BUDGET_KINDS.map((k) => {
            const Icon = k.icon;
            return (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={draft.budgetType === k.value}
                className="adsc-option"
                onClick={() => onChange({ budgetType: k.value })}
              >
                <span className="adsc-option__icon"><Icon size={18} strokeWidth={2} /></span>
                <span style={{ minWidth: 0 }}>
                  <span className="adsc-option__name" style={{ display: "block" }}>{k.label}</span>
                  <span className="adsc-option__desc" style={{ display: "block" }}>{k.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="adsc-grid adsc-grid-2">
        <TextField
          label="Importe"
          type="number"
          value={draft.budgetAmount}
          onChange={(budgetAmount) => onChange({ budgetAmount })}
          error={errors.budgetAmount}
          placeholder="200"
          min={0}
          step="0.01"
          inputMode="decimal"
        />
        <SelectField
          label="Moneda"
          value={draft.currency}
          onChange={(currency) => onChange({ currency })}
          options={CURRENCY_OPTIONS.map((c) => ({ value: c, label: c }))}
        />
      </div>

      <div className="adsc-grid adsc-grid-2">
        <TextField
          label="Fecha de inicio"
          type="date"
          value={draft.startsAt}
          onChange={(startsAt) => onChange({ startsAt })}
          error={errors.startsAt}
        />
        <Field label="Fecha de fin (opcional)" error={errors.endsAt} help="Déjalo vacío para que no tenga fin.">
          <input
            type="date"
            className="input-base"
            value={draft.endsAt}
            min={draft.startsAt || undefined}
            aria-invalid={errors.endsAt ? true : undefined}
            onChange={(e) => onChange({ endsAt: e.target.value })}
          />
        </Field>
      </div>

      <SelectField
        label="Zona horaria"
        value={draft.timezone}
        onChange={(timezone) => onChange({ timezone })}
        options={TIMEZONE_OPTIONS.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))}
      />
    </>
  );
}
