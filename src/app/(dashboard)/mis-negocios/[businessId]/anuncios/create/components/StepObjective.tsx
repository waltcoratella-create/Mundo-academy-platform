"use client";

import { ShoppingCart, UserPlus, MousePointerClick, Megaphone } from "lucide-react";
import type { CampaignDraft, CampaignObjective, Errors } from "../campaign-types";
import { OBJECTIVE_OPTIONS } from "../campaign-types";
import { StepHeading, TextField } from "./Field";

const ICONS: Record<CampaignObjective, React.ElementType> = {
  sales: ShoppingCart,
  leads: UserPlus,
  traffic: MousePointerClick,
  awareness: Megaphone,
};

export function StepObjective({
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
        title="Objetivo"
        hint="Qué quieres conseguir con esta campaña."
      />

      <TextField
        label="Nombre de la campaña"
        value={draft.name}
        onChange={(name) => onChange({ name })}
        error={errors.name}
        placeholder="p. ej. Campaña Ventas · Verano"
        maxLength={120}
      />

      <div className="adsc-field">
        <span className="adsc-label" id="objective-label">Objetivo</span>
        <div className="adsc-options adsc-options-2" role="radiogroup" aria-labelledby="objective-label">
          {OBJECTIVE_OPTIONS.map((o) => {
            const Icon = ICONS[o.value];
            const selected = draft.objective === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className="adsc-option"
                onClick={() => onChange({ objective: o.value })}
              >
                <span className="adsc-option__icon">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="adsc-option__name" style={{ display: "block" }}>{o.label}</span>
                  <span className="adsc-option__desc" style={{ display: "block" }}>{o.description}</span>
                </span>
              </button>
            );
          })}
        </div>
        {errors.objective && <span className="adsc-error" role="alert">{errors.objective}</span>}
      </div>
    </>
  );
}
