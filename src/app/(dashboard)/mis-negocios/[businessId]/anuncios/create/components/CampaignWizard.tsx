"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Check, AlertCircle, ChevronRight } from "lucide-react";
import { uploadAdCreative } from "@/app/actions/upload-actions";
import type { CampaignDraft, Errors, MetaAccountBinding } from "../campaign-types";
import {
  TOTAL_STEPS, PHASES, phaseOfStep, emptyDraft, validateStep,
  validateDraftForSave, countLocalDraftGaps, resolvedCampaignName,
  DEFAULT_TIMEZONE, effectiveCurrency, effectiveTimezone,
} from "../campaign-types";
import { saveCampaignDraft } from "../../campaign-actions";
import { StepCampaign } from "./StepCampaign";
import type { PaymentLinkOption, ProductOption } from "../campaign-types";
import { StepBuild } from "./StepBuild";
import { StepCreatives } from "./StepCreatives";
import { ReviewDrawer } from "./ReviewDrawer";

/** First step of each phase, so the header stepper can jump back to it. */
const PHASE_FIRST_STEP: Record<string, number> = { campaign: 1, build: 2, creatives: 3 };

/** Message shown once the draft is stored — publishing needs Meta + billing. */
const PUBLISH_BLOCKED_MESSAGE =
  "Conecta tu cuenta publicitaria y configura la facturación para publicar esta campaña.";

export interface CampaignWizardProps {
  businessId: string;
  /** Present → editing that campaign (UPDATE). Absent → creating (INSERT). */
  campaignId?: string;
  /** Hydrated draft when editing; a blank one is created otherwise. */
  initialDraft?: CampaignDraft;
  adsHref: string;
  appOrigin: string;
  products: ProductOption[];
  paymentLinks: PaymentLinkOption[];
  paymentLinksAvailable: boolean;
  /** Fallback currency; the connected ad account overrides it when present. */
  defaultCurrency: string;
  /** Connected Meta ad account, or NO_META_ACCOUNT when there is none. */
  metaAccount: MetaAccountBinding;
}

export function CampaignWizard({
  businessId,
  campaignId,
  initialDraft,
  adsHref,
  appOrigin,
  products,
  paymentLinks,
  paymentLinksAvailable,
  defaultCurrency,
  metaAccount,
}: CampaignWizardProps) {
  const router = useRouter();
  const isEditing = Boolean(campaignId);
  // A new draft starts on the account's currency and zone when Meta is
  // connected; an existing one already arrives aligned from draftFromRow.
  const [draft, setDraft] = useState<CampaignDraft>(
    () =>
      initialDraft ??
      emptyDraft(
        effectiveCurrency(metaAccount, defaultCurrency),
        effectiveTimezone(metaAccount, DEFAULT_TIMEZONE)
      )
  );
  const [step, setStep] = useState(1);
  const [maxVisited, setMaxVisited] = useState(() => (campaignId ? TOTAL_STEPS : 1));
  const [errors, setErrors] = useState<Errors>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { published: boolean; localGaps: number }>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

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
      // Fill only the ads still holding the previous auto value (or nothing),
      // so a URL the user typed on a specific ad is never clobbered.
      const previous = autoUrlRef.current;
      const ads = d.creative.ads.map((ad) =>
        !ad.destinationUrl || ad.destinationUrl === previous
          ? { ...ad, destinationUrl: suggestedUrl }
          : ad
      );
      autoUrlRef.current = suggestedUrl;
      return { ...d, creative: { ads } };
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
    // Saving only asks whether the row can be stored. An unfinished draft —
    // no creatives, no destination, unresolved targeting — is expected and
    // must go through; what is still missing is reported afterwards instead.
    const e = validateDraftForSave(draft);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      setSaveError(Object.values(e)[0]);
      return;
    }

    // Counted before the request so the confirmation can say what is left.
    // Local only: this knows nothing about Meta — see countLocalDraftGaps.
    const localGaps = countLocalDraftGaps(draft);

    setSaving(true);
    setSaveError(null);
    try {
      // Both buttons store a draft — Meta is not connected, so nothing can go
      // live. `publishIntent` only changes the confirmation copy.
      const res = await saveCampaignDraft({ businessId, campaignId, draft });
      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      setDirty(false);
      setDone({ published: publishIntent, localGaps });
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
            <h2 className="adsc-done__title">
              {isEditing ? "Cambios guardados" : "Campaña guardada como borrador"}
            </h2>
            <p className="adsc-done__text">
              {done.published
                ? PUBLISH_BLOCKED_MESSAGE
                : "Puedes seguir editándola cuando quieras desde el panel de Anuncios."}
            </p>
            {/* A local count of the draft's own gaps. It deliberately says
                nothing about the Meta connection, interest validity or
                audiences — the publish readiness check will. */}
            {done.localGaps > 0 && (
              <p className="adsc-done__gaps">
                {done.localGaps === 1
                  ? "Falta 1 elemento para poder publicarla."
                  : `Faltan ${done.localGaps} elementos para poder publicarla.`}
              </p>
            )}
            {draft.name.trim() === "" && (
              <p className="adsc-done__gaps">
                Se guardó como «{resolvedCampaignName(draft.name)}». Puedes renombrarla al editarla.
              </p>
            )}
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
        <span className="w-header__title">{isEditing ? "Editar campaña" : "Crear campaña"}</span>

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

      <div className="w-body" data-wide={step === TOTAL_STEPS ? "true" : undefined}>
      <div className={step === TOTAL_STEPS ? "cr-shell" : "adsc-shell"}>
      {/* Step 1 (Campaign) drops the card chrome: the reference puts the form
          sections directly in the 768px column, and the card's 20px side
          padding is what shrank the selection cards below spec width. Steps
          2–6 keep the card until they get the same treatment. */}
      <section className="adsc-step-plain">
        {step === 1 && <StepCampaign draft={draft} errors={errors} onChange={update} />}
        {step === 2 && (
          <StepBuild
            draft={draft}
            errors={errors}
            businessId={businessId}
            metaAccount={metaAccount}
            products={products}
            paymentLinks={paymentLinks}
            paymentLinksAvailable={paymentLinksAvailable}
            onChange={update}
          />
        )}
        {step === 3 && (
          <StepCreatives draft={draft} errors={errors} uploadMedia={uploadMedia} onChange={update} />
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
                  onClick={() => setReviewOpen(true)}
                  disabled={saving}
                >
                  Revisar y finalizar
                  <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
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

      <ReviewDrawer
        open={reviewOpen}
        draft={draft}
        products={products}
        paymentLinks={paymentLinks}
        saving={saving}
        saveError={saveError}
        onClose={() => setReviewOpen(false)}
        onEditStep={(n) => { setReviewOpen(false); goTo(n); }}
        onSaveDraft={() => void handleSubmit(true)}
      />
    </>
  );
}
