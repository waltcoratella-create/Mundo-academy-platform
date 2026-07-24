"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, AlertCircle } from "lucide-react";
import { uploadAdCreative } from "@/app/actions/upload-actions";
import type { CampaignDraft, Errors } from "../campaign-types";
import { TOTAL_STEPS, emptyDraft, validateStep, validateAll } from "../campaign-types";
import { saveDraftCampaign } from "../../campaign-actions";
import { StepObjective } from "./StepObjective";
import { StepProduct, type PaymentLinkOption, type ProductOption } from "./StepProduct";
import { StepAudience } from "./StepAudience";
import { StepBudget } from "./StepBudget";
import { StepCreative } from "./StepCreative";
import { StepReview } from "./StepReview";

const STEP_NAMES = [
  "Objetivo", "Producto", "Audiencia", "Presupuesto", "Creatividad", "Revisión",
];

/** Message shown once the draft is stored — publishing needs Meta + billing. */
const PUBLISH_BLOCKED_MESSAGE =
  "Conecta tu cuenta publicitaria y configura la facturación para publicar esta campaña.";

export interface CampaignWizardProps {
  businessId: string;
  adsHref: string;
  appOrigin: string;
  products: ProductOption[];
  paymentLinks: PaymentLinkOption[];
  paymentLinksAvailable: boolean;
  defaultCurrency: string;
}

export function CampaignWizard({
  businessId,
  adsHref,
  appOrigin,
  products,
  paymentLinks,
  paymentLinksAvailable,
  defaultCurrency,
}: CampaignWizardProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<CampaignDraft>(() => emptyDraft(defaultCurrency));
  const [step, setStep] = useState(1);
  const [maxVisited, setMaxVisited] = useState(1);
  const [errors, setErrors] = useState<Errors>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { published: boolean }>(null);

  /** Last URL we auto-filled, so manual edits are never clobbered. */
  const autoUrlRef = useRef<string>("");

  const update = useCallback((patch: Partial<CampaignDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  }, []);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty || done) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, done]);

  // Keep the creative's destination URL in sync with the step-2 selection.
  const suggestedUrl = useMemo(() => {
    if (draft.destinationKind === "product" && draft.productId) {
      return `${appOrigin}/checkout/${draft.productId}`;
    }
    if (draft.destinationKind === "payment_link" && draft.paymentLinkId) {
      const link = paymentLinks.find((l) => l.id === draft.paymentLinkId);
      return link ? `${appOrigin}/pay/${link.slug}` : "";
    }
    if (draft.destinationKind === "url") return draft.customUrl.trim();
    return "";
  }, [draft.destinationKind, draft.productId, draft.paymentLinkId, draft.customUrl, paymentLinks, appOrigin]);

  useEffect(() => {
    if (!suggestedUrl) return;
    setDraft((d) => {
      const current = d.creative.destinationUrl;
      if (current && current !== autoUrlRef.current) return d; // user edited it
      autoUrlRef.current = suggestedUrl;
      return { ...d, creative: { ...d.creative, destinationUrl: suggestedUrl } };
    });
  }, [suggestedUrl]);

  function goTo(next: number) {
    setErrors({});
    setStep(next);
    setMaxVisited((m) => Math.max(m, next));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNext() {
    const e = validateStep(step, draft);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    goTo(Math.min(step + 1, TOTAL_STEPS));
  }

  function handleBack() {
    if (step === 1) return;
    goTo(step - 1);
  }

  function handleLeave(e: React.MouseEvent) {
    if (!dirty || done) return;
    const ok = window.confirm("Tienes cambios sin guardar. ¿Seguro que quieres salir?");
    if (!ok) e.preventDefault();
  }

  async function handleSubmit(publishIntent: boolean) {
    const e = validateAll(draft);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      setSaveError("Revisa los pasos marcados: falta información obligatoria.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      // Both buttons store a draft — Meta is not connected, so nothing can go
      // live. `publishIntent` only changes the confirmation copy.
      const res = await saveDraftCampaign(businessId, draft);
      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      setDirty(false);
      setDone({ published: publishIntent });
      // Refresh so the new draft is in the dashboard table on return.
      router.refresh();
    } catch {
      setSaveError("No se pudo guardar la campaña. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  /** Bound uploader passed to the creative step (businessId is re-checked server-side). */
  const uploadMedia = useCallback(
    async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return uploadAdCreative(businessId, fd);
    },
    [businessId]
  );

  // ── Saved confirmation ──────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="adsc-shell">
        <div className="adsc-card">
          <div className="adsc-done">
            <span className="adsc-done__icon"><Check size={24} strokeWidth={2.4} /></span>
            <h2 className="adsc-done__title">Campaña guardada como borrador</h2>
            <p className="adsc-done__text">
              {done.published
                ? PUBLISH_BLOCKED_MESSAGE
                : "Puedes seguir editándola cuando quieras desde el panel de Anuncios."}
            </p>
            <Link href={adsHref} className="ads-btn-primary" style={{ marginTop: 4 }}>
              Volver a Anuncios
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Wizard ──────────────────────────────────────────────────────────────────

  const isReview = step === TOTAL_STEPS;

  return (
    <div className="adsc-shell">
      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Link href={adsHref} className="adsc-back" onClick={handleLeave}>
          <ArrowLeft size={16} strokeWidth={2} />
          Anuncios
        </Link>

        <h1 className="adsc-title">Nueva campaña</h1>

        <div className="adsc-progress-row">
          <span className="adsc-progress-label">Paso {step} de {TOTAL_STEPS}</span>
          <div
            className="adsc-bar"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-valuenow={step}
            aria-label={`Paso ${step} de ${TOTAL_STEPS}`}
          >
            <div className="adsc-bar__fill" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        <ol className="adsc-steps">
          {STEP_NAMES.map((name, i) => {
            const n = i + 1;
            const state = n === step ? "current" : n <= maxVisited ? "done" : "todo";
            return (
              <li key={name}>
                <button
                  type="button"
                  className="adsc-chip"
                  data-state={state}
                  aria-current={n === step ? "step" : undefined}
                  disabled={n > maxVisited}
                  onClick={() => goTo(n)}
                >
                  {n < step && <Check size={13} strokeWidth={2.6} />}
                  {n}. {name}
                </button>
              </li>
            );
          })}
        </ol>
      </header>

      <section className="adsc-card">
        {step === 1 && <StepObjective draft={draft} errors={errors} onChange={update} />}
        {step === 2 && (
          <StepProduct
            draft={draft}
            errors={errors}
            products={products}
            paymentLinks={paymentLinks}
            paymentLinksAvailable={paymentLinksAvailable}
            onChange={update}
          />
        )}
        {step === 3 && <StepAudience draft={draft} errors={errors} onChange={update} />}
        {step === 4 && <StepBudget draft={draft} errors={errors} onChange={update} />}
        {step === 5 && (
          <StepCreative draft={draft} errors={errors} uploadMedia={uploadMedia} onChange={update} />
        )}
        {step === 6 && (
          <StepReview
            draft={draft}
            products={products}
            paymentLinks={paymentLinks}
            onEditStep={goTo}
          />
        )}

        {isReview && (
          <div className="adsc-alert" data-tone="amber">
            <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{PUBLISH_BLOCKED_MESSAGE}</span>
          </div>
        )}

        {saveError && (
          <div className="adsc-alert" data-tone="error" role="alert">
            <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{saveError}</span>
          </div>
        )}
      </section>

      <footer className="adsc-nav">
        <button
          type="button"
          className="btn-surface"
          onClick={handleBack}
          disabled={step === 1 || saving}
        >
          Atrás
        </button>

        <div className="adsc-nav__right">
          {isReview ? (
            <>
              <button
                type="button"
                className="btn-surface"
                onClick={() => void handleSubmit(false)}
                disabled={saving}
              >
                {saving ? "Guardando…" : "Guardar borrador"}
              </button>
              <button
                type="button"
                className="ads-btn-primary"
                onClick={() => void handleSubmit(true)}
                disabled={saving}
              >
                {saving ? "Guardando…" : "Publicar campaña"}
              </button>
            </>
          ) : (
            <button type="button" className="ads-btn-primary" onClick={handleNext} disabled={saving}>
              Siguiente
            </button>
          )}
        </div>
      </footer>

    </div>
  );
}
