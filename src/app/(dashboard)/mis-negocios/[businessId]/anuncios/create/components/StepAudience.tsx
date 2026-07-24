"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { CampaignAudience, CampaignDraft, Errors, Gender } from "../campaign-types";
import { AGE_MAX, AGE_MIN, GENDER_OPTIONS, LANGUAGE_OPTIONS } from "../campaign-types";
import { StepHeading, TextField, SelectField, Field } from "./Field";

export function StepAudience({
  draft,
  errors,
  onChange,
}: {
  draft: CampaignDraft;
  errors: Errors;
  onChange: (patch: Partial<CampaignDraft>) => void;
}) {
  const [interestInput, setInterestInput] = useState("");
  const a = draft.audience;

  function patchAudience(patch: Partial<CampaignAudience>) {
    onChange({ audience: { ...a, ...patch } });
  }

  function addInterest() {
    const value = interestInput.trim();
    if (!value) return;
    if (a.interests.some((i) => i.toLowerCase() === value.toLowerCase())) {
      setInterestInput("");
      return;
    }
    patchAudience({ interests: [...a.interests, value] });
    setInterestInput("");
  }

  return (
    <>
      <StepHeading
        title="Audiencia"
        hint="A quién quieres mostrar el anuncio. Se guarda con la campaña; se enviará a Meta cuando conectes la cuenta."
      />

      <TextField
        label="Ubicación"
        value={a.locations}
        onChange={(locations) => patchAudience({ locations })}
        placeholder="España, México, Argentina"
        help="Separa varias ubicaciones con comas."
      />

      <div className="adsc-grid adsc-grid-2">
        <TextField
          label="Edad mínima"
          type="number"
          value={String(a.ageMin)}
          onChange={(v) => patchAudience({ ageMin: Number(v) })}
          error={errors.ageMin}
          min={AGE_MIN}
          max={AGE_MAX}
        />
        <TextField
          label="Edad máxima"
          type="number"
          value={String(a.ageMax)}
          onChange={(v) => patchAudience({ ageMax: Number(v) })}
          error={errors.ageMax}
          min={AGE_MIN}
          max={AGE_MAX}
        />
      </div>

      <div className="adsc-grid adsc-grid-2">
        <SelectField
          label="Género"
          value={a.gender}
          onChange={(v) => patchAudience({ gender: v as Gender })}
          options={GENDER_OPTIONS}
        />
        <SelectField
          label="Idioma"
          value={a.language}
          onChange={(language) => patchAudience({ language })}
          options={LANGUAGE_OPTIONS}
        />
      </div>

      <Field label="Intereses" help="Escribe un interés y pulsa Enter para añadirlo.">
        <input
          className="input-base"
          value={interestInput}
          placeholder="Emprendimiento, marketing digital…"
          onChange={(e) => setInterestInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addInterest();
            }
          }}
          onBlur={addInterest}
        />
        {a.interests.length > 0 && (
          <div className="adsc-tags" style={{ marginTop: 8 }}>
            {a.interests.map((interest) => (
              <span key={interest} className="adsc-tag">
                {interest}
                <button
                  type="button"
                  aria-label={`Quitar ${interest}`}
                  onClick={() =>
                    patchAudience({ interests: a.interests.filter((i) => i !== interest) })
                  }
                >
                  <X size={13} strokeWidth={2.4} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>
    </>
  );
}
