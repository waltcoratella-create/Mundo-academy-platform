"use client";

import { Package, Link2, Globe } from "lucide-react";
import type { CampaignDraft, DestinationKind, Errors } from "../campaign-types";
import { StepHeading, TextField, Field } from "./Field";

export interface ProductOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  status: string;
}

export interface PaymentLinkOption {
  id: string;
  title: string;
  slug: string;
  productName: string;
  active: boolean;
}

const KINDS: { value: DestinationKind; label: string; description: string; icon: React.ElementType }[] = [
  { value: "product",      label: "Producto",        description: "Un producto de tu negocio.", icon: Package },
  { value: "payment_link", label: "Enlace de pago",  description: "Un enlace ya creado.",       icon: Link2 },
  { value: "url",          label: "URL personalizada", description: "Cualquier página web.",    icon: Globe },
];

export function StepProduct({
  draft,
  errors,
  products,
  paymentLinks,
  paymentLinksAvailable,
  onChange,
}: {
  draft: CampaignDraft;
  errors: Errors;
  products: ProductOption[];
  paymentLinks: PaymentLinkOption[];
  paymentLinksAvailable: boolean;
  onChange: (patch: Partial<CampaignDraft>) => void;
}) {
  return (
    <>
      <StepHeading
        title="Producto"
        hint="A dónde llevas a la gente que hace clic en el anuncio."
      />

      <div className="adsc-field">
        <span className="adsc-label" id="dest-label">Destino</span>
        <div className="adsc-options" role="radiogroup" aria-labelledby="dest-label" style={{ gap: 8 }}>
          {KINDS.map((k) => {
            const Icon = k.icon;
            return (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={draft.destinationKind === k.value}
                className="adsc-option"
                onClick={() => onChange({ destinationKind: k.value })}
              >
                <span className="adsc-option__icon"><Icon size={18} strokeWidth={2} /></span>
                <span style={{ minWidth: 0 }}>
                  <span className="adsc-option__name" style={{ display: "block" }}>{k.label}</span>
                  <span className="adsc-option__desc" style={{ display: "block" }}>{k.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {draft.destinationKind === "product" && (
        <Field label="Producto" error={errors.productId}>
          {products.length === 0 ? (
            <p className="adsc-help">
              Este negocio todavía no tiene productos. Crea uno o usa una URL personalizada.
            </p>
          ) : (
            <select
              className="input-base"
              value={draft.productId ?? ""}
              aria-invalid={errors.productId ? true : undefined}
              onChange={(e) => onChange({ productId: e.target.value || null })}
            >
              <option value="">Selecciona un producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.price > 0 ? ` · ${p.price} ${p.currency}` : ""}
                  {p.status !== "published" ? " (borrador)" : ""}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      {draft.destinationKind === "payment_link" && (
        <Field label="Enlace de pago" error={errors.paymentLinkId}>
          {!paymentLinksAvailable ? (
            <p className="adsc-help">
              Los enlaces de pago aún no están configurados en este negocio.
            </p>
          ) : paymentLinks.length === 0 ? (
            <p className="adsc-help">
              Todavía no has creado enlaces de pago.
            </p>
          ) : (
            <select
              className="input-base"
              value={draft.paymentLinkId ?? ""}
              aria-invalid={errors.paymentLinkId ? true : undefined}
              onChange={(e) => onChange({ paymentLinkId: e.target.value || null })}
            >
              <option value="">Selecciona un enlace…</option>
              {paymentLinks.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} · {l.productName}{l.active ? "" : " (inactivo)"}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      {draft.destinationKind === "url" && (
        <TextField
          label="URL personalizada"
          value={draft.customUrl}
          onChange={(customUrl) => onChange({ customUrl })}
          error={errors.customUrl}
          placeholder="https://tu-web.com/oferta"
          inputMode="url"
        />
      )}
    </>
  );
}
