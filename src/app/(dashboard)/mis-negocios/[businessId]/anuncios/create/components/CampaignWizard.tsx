"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Check, AlertCircle, ChevronRight } from "lucide-react";
import { uploadAdCreative } from "@/app/actions/upload-actions";
import type { CampaignDraft, Errors } from "../campaign-types";
import { TOTAL_STEPS, PHASES, phaseOfStep, emptyDraft, validateStep, validateAll } from "../campaign-types";
import { saveDraftCampaign } from "../../campaign-actions";
import { StepCampaign } from "./StepCampaign";
import { StepProduct, type PaymentLinkOption, type ProductOption } from "./StepProduct";
import { StepAudience } from "./StepAudience";
import { StepBudget } from "./StepBudget";
import { StepCreative } from "./StepCreative";
import { StepReview } from "./StepReview";

/** First step of each phase, so the header stepper can jump back to it. */
const PHASE_FIRST_STEP: Record<string, number> = { campaign: 1, build: 2, creatives: 5 };

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
    <>
      {/* Flow chrome — 56px header with the Campaign › Build › Creatives
          stepper, matching the reference. Replaces the old "Paso X de 6". */}
      <header className="w-header">
        <Link href={adsHref} className="w-header__close" aria-label="Cerrar" onClick={handleLeave}>
          <X size={18} strokeWidth={2} />
        </Link>
        <span className="w-header__title">Crear campaña</span>

        <nav className="w-stepper" aria-label="Fases">
          {PHASES.map((p, i) => {
            const current = phaseOfStep(step);
            const currentIndex = PHASES.findIndex((x) => x.key === current);
            const state = i === currentIndex ? "current" : i < currentIndex ? "done" : "todo";
            const target = PHASE_FIRST_STEP[p.key];
            return (
              <span key={p.key} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {i > 0 && <ChevronRight className="w-stepsep" size={14} strokeWidth={2} aria-hidden="true" />}
                <button
                  type="button"
                  className="w-stepitem"
                  data-state={state}
                  aria-current={state === "current" ? "step" : undefined}
                  disabled={state !== "done" || target > maxVisited}
                  onClick={() => goTo(target)}
                >
                  {state === "done" && <Check size={14} strokeWidth={2.6} aria-hidden="true" />}
                  {p.label}
                </button>
              </span>
            );
          })}
        </nav>
      </header>

      <div className="w-body">
      <div className="adsc-shell">
      {/* Step 1 (Campaign) drops the card chrome: the reference puts the form
          sections directly in the 768px column, and the card's 20px side
          padding is what shrank the selection cards below spec width. Steps
          2–6 keep the card until they get the same treatment. */}
      <section className={step === 1 ? "adsc-step-plain" : "adsc-card"}>
        {step === 1 && <StepCampaign draft={draft} errors={errors} onChange={update} />}
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

      </div>
      </div>

      {/* Fixed footer bar — "Siguiente" on the right, per the reference. */}
      <footer className="w-footer">
        <div className="w-footer__inner">
          <button
            type="button"
            className="w-btn w-btn--ghost"
            onClick={handleBack}
            disabled={step === 1 || saving}
            style={{ visibility: step === 1 ? "hidden" : undefined }}
          >
            Atrás
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isReview ? (
              <>
                <button
                  type="button"
                  className="w-btn w-btn--ghost"
                  onClick={() => void handleSubmit(false)}
                  disabled={saving}
                >
                  {saving ? "Guardando…" : "Guardar borrador"}
                </button>
                <button
                  type="button"
                  className="w-btn w-btn--primary"
                  onClick={() => void handleSubmit(true)}
                  disabled={saving}
                >
                  {saving ? "Guardando…" : "Publicar campaña"}
                </button>
              </>
            ) : (
              <button type="button" className="w-btn w-btn--primary" onClick={handleNext} disabled={saving}>
                Siguiente
                <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}
