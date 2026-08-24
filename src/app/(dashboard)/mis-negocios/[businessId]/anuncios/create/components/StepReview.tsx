"use client";

import type { CampaignDraft } from "../campaign-types";
import {
  BUDGET_TYPE_LABEL, CTA_OPTIONS, GENDER_OPTIONS, LANGUAGE_OPTIONS, OBJECTIVE_LABEL,
} from "../campaign-types";
import { StepHeading } from "./Field";
import type { PaymentLinkOption, ProductOption } from "../campaign-types";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="adsc-summary-row">
      <span className="adsc-summary-row__label">{label}</span>
      <span className="adsc-summary-row__value">{value}</span>
    </div>
  );
}

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="adsc-section-head">
        <h3 className="adsc-section-title">{title}</h3>
        <button type="button" className="adsc-edit" onClick={onEdit}>Editar</button>
      </div>
      <div className="adsc-summary">{children}</div>
    </div>
  );
}

const DASH = "—";

function labelFor(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function StepReview({
  draft,
  products,
  paymentLinks,
  onEditStep,
}: {
  draft: CampaignDraft;
  products: ProductOption[];
  paymentLinks: PaymentLinkOption[];
  onEditStep: (step: number) => void;
}) {
  const product = products.find((p) => p.id === draft.productId);
  const link = paymentLinks.find((l) => l.id === draft.paymentLinkId);

  const destination =
    draft.destinationKind === "product"
      ? product?.name ?? DASH
      : draft.destinationKind === "payment_link"
        ? link?.title ?? DASH
        : draft.customUrl || DASH;

  const destinationKindLabel =
    draft.destinationKind === "product"
      ? "Producto"
      : draft.destinationKind === "payment_link"
        ? "Enlace de pago"
        : "URL personalizada";

  const a = draft.audience;
  const c = draft.creative;

  return (
    <>
      <StepHeading
        title="Revisión"
        hint="Comprueba que todo está bien antes de guardar."
      />

      <Section title="Objetivo" onEdit={() => onEditStep(1)}>
        <Row label="Nombre" value={draft.name || DASH} />
        <Row label="Objetivo" value={draft.objective ? OBJECTIVE_LABEL[draft.objective] : DASH} />
      </Section>

      <Section title="Destino" onEdit={() => onEditStep(2)}>
        <Row label="Tipo de destino" value={destinationKindLabel} />
        <Row label="Destino" value={destination} />
      </Section>

      <Section title="Audiencia" onEdit={() => onEditStep(2)}>
        <Row
          label="Ubicación"
          value={
            a.globalReach
              ? "Alcance global"
              : a.includedLocations.length
                ? a.includedLocations.join(", ")
                : "Sin especificar"
          }
        />
        {a.excludedLocations.length > 0 && (
          <Row label="Excluidas" value={a.excludedLocations.join(", ")} />
        )}
        <Row label="Audiencia Advantage+" value={a.advantageAudience ? "Activada" : "Manual"} />
        <Row label="Edad" value={a.advantageAudience ? `${a.ageMin}+` : `${a.ageMin} – ${a.ageMax}`} />
        <Row label="Género" value={labelFor(GENDER_OPTIONS, a.gender)} />
        <Row
          label="Idiomas"
          value={
            a.languages.length
              ? a.languages.map((l) => labelFor(LANGUAGE_OPTIONS, l)).join(", ")
              : "Todos los idiomas"
          }
        />
        <Row label="Intereses" value={a.interests.length ? a.interests.join(", ") : "Sin especificar"} />
      </Section>

      <Section title="Presupuesto y calendario" onEdit={() => onEditStep(2)}>
        <Row label="Tipo" value={BUDGET_TYPE_LABEL[draft.budgetType]} />
        <Row
          label="Importe"
          value={draft.budgetAmount ? `${draft.budgetAmount} ${draft.currency}` : DASH}
        />
        <Row label="Inicio" value={draft.startsAt || DASH} />
        <Row label="Fin" value={draft.endsAt || "Sin fecha de fin"} />
        <Row label="Zona horaria" value={draft.timezone} />
      </Section>

      <Section title="Creatividad" onEdit={() => onEditStep(3)}>
        <Row
          label="Archivo"
          value={c.mediaUrl ? (c.mediaType === "video" ? "Vídeo subido" : "Imagen subida") : "Sin archivo"}
        />
        <Row label="Texto principal" value={c.primaryText || DASH} />
        <Row label="Título" value={c.headline || DASH} />
        <Row label="Descripción" value={c.description || DASH} />
        <Row label="CTA" value={labelFor(CTA_OPTIONS, c.cta)} />
        <Row label="URL de destino" value={c.destinationUrl || DASH} />
      </Section>
    </>
  );
}
