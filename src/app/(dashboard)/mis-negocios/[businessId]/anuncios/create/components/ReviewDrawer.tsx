"use client";

import { useEffect, useRef, useState } from "react";
import { X, AlertCircle, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import type {
  CampaignDraft, CampaignGeoLocation, PaymentLinkOption, ProductOption,
} from "../campaign-types";
import {
  BUDGET_TYPE_LABEL, CTA_OPTIONS, GENDER_OPTIONS, LANGUAGE_OPTIONS, OBJECTIVE_LABEL,
  CONVERSION_EVENTS,
} from "../campaign-types";
import type { ReadinessIssue, ReadinessResult } from "../readiness-types";
import { READINESS_SECTION_LABEL, groupBySection } from "../readiness-types";
import { checkPublishReadiness } from "../readiness-actions";

/**
 * Review — the old fourth step, now a side drawer opened from Creatives.
 *
 * Same summary and the same "Editar" jumps as before; it just stopped being a
 * screen so the flow reads Campaign → Build → Creatives. The final actions live
 * here because this is the last thing you see before committing.
 */

const DASH = "—";

/**
 * Locations saved before the Meta search have no key and cannot be published.
 * The review flags them instead of showing a name that looks ready.
 */
function geoLabel(loc: CampaignGeoLocation): string {
  return loc.key ? loc.name : `${loc.name} (pendiente de confirmar)`;
}

/** Same rule for the other two targeting families. */
function idLabel(item: { id: string | null; name: string }): string {
  return item.id ? item.name : `${item.name} (pendiente de confirmar)`;
}

/**
 * Publish readiness summary.
 *
 * Rendered from coded issues, never from free text: the copy below can change
 * without breaking anything that keys on `issue.code`.
 */
function IssueList({ items, tone }: { items: ReadinessIssue[]; tone: "error" | "warning" }) {
  return (
    <>
      {groupBySection(items).map((group) => (
        <div className="cr-ready__group" key={`${tone}-${group.section}`}>
          <span className="cr-ready__grouptitle">
            {READINESS_SECTION_LABEL[group.section]}
          </span>
          <ul className="cr-ready__list">
            {group.items.map((issue) => (
              <li className="cr-ready__item" key={`${issue.code}-${issue.field ?? ""}`} data-tone={tone}>
                <span className="cr-ready__msg">{issue.message}</span>
                {issue.remediation && (
                  <span className="cr-ready__fix">{issue.remediation}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function ReadinessBlock({
  loading,
  error,
  result,
}: {
  loading: boolean;
  error: string | null;
  result: ReadinessResult | null;
}) {
  if (loading) {
    return (
      <div className="cr-ready" data-state="loading" role="status">
        <Loader2 size={16} strokeWidth={2} className="cr-ready__spin" aria-hidden="true" />
        <span className="cr-ready__title">Comprobando si la campaña está lista para publicar…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cr-ready" data-state="warning" role="alert">
        <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
        <span className="cr-ready__title">{error}</span>
      </div>
    );
  }

  if (!result) return null;

  const missing = result.errors.length;

  /**
   * "Ready" and "verified" are not the same claim.
   *
   * A failed Meta check is a warning, not proof of invalidity, so it does not
   * flip `ready` to false — but it does mean we never confirmed the Meta side.
   * Showing a green "Listo para publicar" there would assert something we did
   * not check, so that case gets its own, weaker headline.
   */
  const fullyVerified = result.ready && result.checkedMeta;
  const readyButUnverified = result.ready && !result.checkedMeta;

  return (
    <div
      className="cr-ready"
      data-state={fullyVerified ? "ready" : readyButUnverified ? "warning" : "blocked"}
    >
      <div className="cr-ready__head">
        {fullyVerified
          ? <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
          : readyButUnverified
            ? <TriangleAlert size={16} strokeWidth={2} aria-hidden="true" />
            : <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />}
        <span className="cr-ready__title">
          {fullyVerified
            ? "Listo para publicar"
            : readyButUnverified
              ? "Sin bloqueos detectados, pero no pudimos completar la comprobación con Meta."
              : missing === 1
                ? "Falta 1 elemento para publicar"
                : `Faltan ${missing} elementos para publicar`}
        </span>
      </div>

      {missing > 0 && <IssueList items={result.errors} tone="error" />}

      {result.warnings.length > 0 && (
        <div className="cr-ready__warnings">
          <span className="cr-ready__grouptitle">
            <TriangleAlert size={13} strokeWidth={2} aria-hidden="true" />
            Avisos
          </span>
          <IssueList items={result.warnings} tone="warning" />
        </div>
      )}

      {/* Only when the headline has not already said it. */}
      {!result.checkedMeta && !result.ready && (
        <span className="cr-ready__note">
          Además, no se pudieron ejecutar las comprobaciones contra Meta.
        </span>
      )}
    </div>
  );
}

function labelFor(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="adsc-summary-row">
      <span className="adsc-summary-row__label">{label}</span>
      <span className="adsc-summary-row__value">{value}</span>
    </div>
  );
}

function Section({ title, onEdit, children }: { title: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="adsc-section-head">
        <h3 className="adsc-section-title">{title}</h3>
        {onEdit && <button type="button" className="adsc-edit" onClick={onEdit}>Editar</button>}
      </div>
      <div className="adsc-summary">{children}</div>
    </div>
  );
}

export function ReviewDrawer({
  open,
  businessId,
  draft,
  products,
  paymentLinks,
  saving,
  saveError,
  onClose,
  onEditStep,
  onSaveDraft,
}: {
  open: boolean;
  /** Needed by the readiness action, which re-checks ownership server-side. */
  businessId: string;
  draft: CampaignDraft;
  products: ProductOption[];
  paymentLinks: PaymentLinkOption[];
  saving: boolean;
  saveError: string | null;
  onClose: () => void;
  onEditStep: (step: number) => void;
  onSaveDraft: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /**
   * One check per opening.
   *
   * `open` is the only dependency on purpose: revalidating on every keystroke
   * would spend a rate-limited access tier for nothing. Closing, editing and
   * reopening runs it again, which is when the answer can actually differ.
   */
  useEffect(() => {
    if (!open) {
      setReadiness(null);
      setReadinessError(null);
      return;
    }

    let cancelled = false;
    setReadinessLoading(true);
    setReadinessError(null);

    checkPublishReadiness(businessId, draft)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setReadiness(res.result);
        else setReadinessError(res.error);
      })
      .catch(() => {
        if (!cancelled) {
          setReadinessError("No se pudo comprobar si la campaña está lista para publicar.");
        }
      })
      .finally(() => { if (!cancelled) setReadinessLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, businessId]);

  if (!open) return null;

  const product = products.find((p) => p.id === draft.productId);
  const link = paymentLinks.find((l) => l.id === draft.paymentLinkId);
  const destination =
    draft.destinationKind === "product" ? product?.name ?? DASH
      : draft.destinationKind === "payment_link" ? link?.title ?? DASH
        : draft.customUrl || DASH;
  const destinationKindLabel =
    draft.destinationKind === "product" ? "Producto"
      : draft.destinationKind === "payment_link" ? "Enlace de pago"
        : "URL personalizada";

  const a = draft.audience;
  const d = draft.delivery;
  const ads = draft.creative.ads;

  return (
    <>
      <div className="cr-scrim" onClick={onClose} aria-hidden="true" />
      <aside
        className="cr-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Revisar campaña"
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="cr-drawer__head">
          <h2 className="cr-drawer__title">Revisar campaña</h2>
          <button type="button" className="cr-iconbtn" onClick={onClose} aria-label="Cerrar">
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="cr-drawer__body">
          <ReadinessBlock
            loading={readinessLoading}
            error={readinessError}
            result={readiness}
          />

          <Section title="Campaña" onEdit={() => onEditStep(1)}>
            <Row label="Nombre" value={draft.name || DASH} />
            <Row label="Objetivo" value={draft.objective ? OBJECTIVE_LABEL[draft.objective] : DASH} />
            <Row label="Plataforma" value={draft.platform} />
            <Row label="Presupuesto" value={draft.budgetAmount ? `${draft.budgetAmount} ${draft.currency} · ${BUDGET_TYPE_LABEL[draft.budgetType]}` : DASH} />
          </Section>

          <Section title="Destino" onEdit={() => onEditStep(2)}>
            <Row label="Tipo" value={destinationKindLabel} />
            <Row label="Destino" value={destination} />
            <Row label="Evento de conversión" value={d.conversionEvent ? labelFor(CONVERSION_EVENTS, d.conversionEvent) : DASH} />
          </Section>

          <Section title="Audiencia" onEdit={() => onEditStep(2)}>
            <Row
              label="Ubicación"
              value={
                a.globalReach
                  ? "Alcance global"
                  : a.includedLocations.length
                    ? a.includedLocations.map(geoLabel).join(", ")
                    : "Sin especificar"
              }
            />
            {a.excludedLocations.length > 0 && (
              <Row label="Excluidas" value={a.excludedLocations.map(geoLabel).join(", ")} />
            )}
            <Row label="Audiencia Advantage+" value={a.advantageAudience ? "Activada" : "Manual"} />
            {/* Meta ignores manual interests under Advantage+, so the review
                says so instead of implying they will be applied. */}
            {a.interests.length > 0 && (
              <Row
                label="Intereses"
                value={
                  a.advantageAudience
                    ? `${a.interests.map(idLabel).join(", ")} · sin efecto con Advantage+`
                    : a.interests.map(idLabel).join(", ")
                }
              />
            )}
            {a.customAudiencesIncluded.length > 0 && (
              <Row label="Audiencias incluidas" value={a.customAudiencesIncluded.map(idLabel).join(", ")} />
            )}
            {a.customAudiencesExcluded.length > 0 && (
              <Row label="Audiencias excluidas" value={a.customAudiencesExcluded.map(idLabel).join(", ")} />
            )}
            <Row label="Edad" value={a.advantageAudience ? `${a.ageMin}+` : `${a.ageMin} – ${a.ageMax}`} />
            {!a.advantageAudience && <Row label="Género" value={labelFor(GENDER_OPTIONS, a.gender)} />}
            <Row label="Idiomas" value={a.languages.length ? a.languages.map((l) => labelFor(LANGUAGE_OPTIONS, l)).join(", ") : "Todos los idiomas"} />
          </Section>

          <Section title="Calendario" onEdit={() => onEditStep(2)}>
            <Row label="Inicio" value={draft.startsAt.replace("T", " ") || DASH} />
            <Row label="Fin" value={draft.endsAt ? draft.endsAt.replace("T", " ") : "Sin fecha de fin"} />
            <Row label="Zona horaria" value={draft.timezone.replace(/_/g, " ")} />
          </Section>

          <Section title={`Creativos (${ads.length})`} onEdit={onClose}>
            {ads.map((ad, i) => (
              <Row
                key={ad.id}
                label={`Anuncio ${i + 1}`}
                value={
                  <>
                    {ad.headline || "Sin titular"}
                    {" · "}
                    {ad.mediaUrl ? (ad.mediaType === "video" ? "vídeo" : "imagen") : "sin archivo"}
                    {" · "}
                    {labelFor(CTA_OPTIONS, ad.cta)}
                  </>
                }
              />
            ))}
          </Section>

          {/* Publishing is not wired: nothing is sent to Meta yet, so the flow
              deliberately stops at "saved draft" instead of pretending. */}
          <div className="adsc-alert" data-tone="amber">
            <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <span>
              Conecta tu cuenta publicitaria de Meta para publicar. Por ahora la campaña se
              guarda como borrador.
            </span>
          </div>

          {saveError && (
            <div className="adsc-alert" data-tone="error" role="alert">
              <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <span>{saveError}</span>
            </div>
          )}
        </div>

        <footer className="cr-drawer__foot">
          <button type="button" className="w-btn w-btn--ghost" onClick={onClose} disabled={saving}>
            Seguir editando
          </button>
          <button type="button" className="w-btn w-btn--primary" onClick={onSaveDraft} disabled={saving}>
            {saving ? "Guardando…" : "Guardar campaña"}
          </button>
        </footer>
      </aside>
    </>
  );
}
