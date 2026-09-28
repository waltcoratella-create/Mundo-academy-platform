"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Scale } from "lucide-react";
import type { DsaSettings } from "@/lib/meta/ad-settings";
import { DSA_MAX_LENGTH } from "@/lib/meta/dsa";
import { saveDsaSettingsAction } from "./dsa-actions";

/**
 * EU ad transparency (DSA): advertiser and payer.
 *
 * Deliberately never pre-filled — not from the page name, not from the
 * business name. Both are legal declarations published in the EU ad library,
 * so a person types them and confirms them.
 */
export function DsaSettingsPanel({
  businessId,
  initial,
}: {
  businessId: string;
  initial: DsaSettings | null;
}) {
  const [saved, setSaved] = useState<DsaSettings | null>(initial);
  const [editing, setEditing] = useState(initial === null);
  const [beneficiary, setBeneficiary] = useState(initial?.beneficiary ?? "");
  const [payor, setPayor] = useState(initial?.payor ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await saveDsaSettingsAction({ businessId, beneficiary, payor, confirmed });
      if (!res.ok) { setError(res.error); return; }
      setSaved(res.settings);
      setEditing(false);
      setConfirmed(false);
    });
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4 mt-4">
      <header className="flex items-start gap-3">
        <Scale className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">Transparencia de anuncios en la UE</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Meta exige indicar quién se anuncia y quién paga en los anuncios dirigidos a la Unión
            Europea. Estos nombres se publican en la biblioteca de anuncios de Meta.
          </p>
        </div>
      </header>

      {!editing && saved && (
        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-[13px]">
            <dt className="text-gray-500">Anunciante</dt>
            <dd className="text-gray-900 font-medium">{saved.beneficiary}</dd>
            <dt className="text-gray-500">Pagador</dt>
            <dd className="text-gray-900 font-medium">{saved.payor}</dd>
          </dl>
          <p className="flex items-center gap-1.5 text-[12px] text-gray-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
            Confirmado el {new Date(saved.confirmedAt).toLocaleDateString("es-ES")}
          </p>
          <button
            type="button"
            onClick={() => { setEditing(true); setConfirmed(false); }}
            className="self-start px-3 py-1.5 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
          >
            Cambiar
          </button>
        </div>
      )}

      {editing && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-[13px]">
            <span className="font-medium text-gray-800">Anunciante (beneficiario)</span>
            <span className="text-gray-500">La marca, persona u organización que se promociona.</span>
            <input
              value={beneficiary}
              maxLength={DSA_MAX_LENGTH}
              onChange={(e) => setBeneficiary(e.target.value)}
              className="mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-[13px]">
            <span className="font-medium text-gray-800">Pagador</span>
            <span className="text-gray-500">La persona u organización que paga los anuncios.</span>
            <input
              value={payor}
              maxLength={DSA_MAX_LENGTH}
              onChange={(e) => setPayor(e.target.value)}
              className="mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </label>
          <label className="flex items-start gap-2 text-[13px] text-gray-700">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            Confirmo que estos datos son correctos y que pueden publicarse en la biblioteca de
            anuncios de Meta junto a los anuncios de este negocio.
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-[13px] text-red-800" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || !confirmed}
              className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            {saved && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setBeneficiary(saved.beneficiary);
                  setPayor(saved.payor);
                  setError(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
