"use client";

import { useEffect, useRef } from "react";
import { X, AlertCircle } from "lucide-react";
import type {
  CampaignDraft, CampaignGeoLocation, PaymentLinkOption, ProductOption,
} from "../campaign-types";
import {
  BUDGET_TYPE_LABEL, CTA_OPTIONS, GENDER_OPTIONS, LANGUAGE_OPTIONS, OBJECTIVE_LABEL,
  CONVERSION_EVENTS,
} from "../campaign-types";

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

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
