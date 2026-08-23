"use client";

import type { CampaignDraft, Errors } from "../campaign-types";
import { CURRENCY_OPTIONS, TIMEZONE_OPTIONS } from "../campaign-types";
import { StepHeading, TextField, SelectField, Field } from "./Field";


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
        title="Calendario"
        hint="Cuándo se entrega la campaña. El importe diario se define en Campaign."
      />

      <SelectField
        label="Moneda"
        value={draft.currency}
        onChange={(currency) => onChange({ currency })}
        options={CURRENCY_OPTIONS.map((c) => ({ value: c, label: c }))}
      />

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
