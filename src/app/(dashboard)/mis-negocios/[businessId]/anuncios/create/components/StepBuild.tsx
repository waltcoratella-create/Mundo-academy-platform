"use client";

import { useId, useMemo, useState } from "react";
import { Globe, Monitor, MessageCircle, Package, Link2, X } from "lucide-react";
import type {
  CampaignAudience, CampaignDelivery, CampaignDraft, ConversionLocation,
  DestinationKind, Errors, Gender,
} from "../campaign-types";
import {
  CONVERSION_LOCATIONS, CONVERSION_EVENTS, MIN_AGE_OPTIONS, LOCATION_SUGGESTIONS,
  CURRENCY_OPTIONS, TIMEZONE_OPTIONS, GENDER_OPTIONS, LANGUAGE_OPTIONS,
  AGE_MIN, AGE_MAX,
} from "../campaign-types";
import type { PaymentLinkOption, ProductOption } from "../campaign-types";

/**
 * Build — the ad set, laid out to the Whop Ads build spec (step 2).
 *
 * Absorbs the wizard's old Producto / Audiencia / Calendario screens so the
 * flow is Campaign → Build → Creatives without losing any existing field or
 * validation. The destination selector sits next to Conversion location because
 * Mundo Academy needs a product/link/URL to build the destination URL.
 *
 * Conversion location/event and Advantage+ placements are delivery settings,
 * persisted to the `delivery` jsonb — kept separate from `audience`, which is
 * targeting only.
 */

function Section({
  label,
  required,
  description,
  error,
  isField,
  labelFor,
  children,
}: {
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  isField?: boolean;
  labelFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-section" data-field={isField ? "true" : undefined}>
      <div className="w-head">
        {labelFor ? (
          <label className="w-label" htmlFor={labelFor}>
            {label} {required && <span className="w-req" aria-hidden="true">*</span>}
          </label>
        ) : (
          <span className="w-label">
            {label} {required && <span className="w-req" aria-hidden="true">*</span>}
          </span>
        )}
        {description && <span className="w-desc">{description}</span>}
      </div>
      {children}
      {error && <span className="w-error" role="alert">{error}</span>}
    </div>
  );
}

/** 42×24 track with a 22×22 knob — the spec's switch. */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="w-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="w-switch__knob" />
    </button>
  );
}

/** Recommendation card used by both Advantage+ blocks. */
function RecommendationCard({
  title,
  description,
  checked,
  onChange,
  children,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="w-reco">
      <div className="w-reco__main">
        <div className="w-reco__text">
          <div className="w-reco__titlerow">
            <span className="w-reco__title">{title}</span>
            <span className="w-badge">Recomendado</span>
          </div>
          <span className="w-reco__desc">{description}</span>
        </div>
        <Switch checked={checked} onChange={onChange} label={title} />
      </div>
      {children && <div className="w-reco__extra">{children}</div>}
    </div>
  );
}

export function StepBuild({
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
  const eventId = useId();
  const minAgeId = useId();
  const [geoTab, setGeoTab] = useState<"include" | "exclude">("include");
  const [geoQuery, setGeoQuery] = useState("");

  const a = draft.audience;
  const d = draft.delivery;

  function patchAudience(patch: Partial<CampaignAudience>) {
    onChange({ audience: { ...a, ...patch } });
  }
  function patchDelivery(patch: Partial<CampaignDelivery>) {
    onChange({ delivery: { ...d, ...patch } });
  }

  const activeList = geoTab === "include" ? a.includedLocations : a.excludedLocations;

  const suggestions = useMemo(() => {
    const q = geoQuery.trim().toLowerCase();
    if (!q) return [];
    return LOCATION_SUGGESTIONS.filter(
      (l) => l.toLowerCase().includes(q) && !activeList.includes(l)
    ).slice(0, 6);
  }, [geoQuery, activeList]);

  function addLocation(name: string) {
    const key = geoTab === "include" ? "includedLocations" : "excludedLocations";
    patchAudience({ [key]: [...activeList, name] } as Partial<CampaignAudience>);
    setGeoQuery("");
  }
  function removeLocation(name: string) {
    const key = geoTab === "include" ? "includedLocations" : "excludedLocations";
    patchAudience({ [key]: activeList.filter((l) => l !== name) } as Partial<CampaignAudience>);
  }
  function clearAll() {
    patchAudience({ includedLocations: [], excludedLocations: [] });
  }

  return (
    <div className="w-sections">
      {/* ── Heading ── */}
      <div className="w-buildhead">
        <h2 className="w-buildhead__title">Configuraciones predeterminadas</h2>
        <p className="w-buildhead__sub">Estos se pueden cambiar en cualquier momento.</p>
      </div>

      {/* ── 1 · Conversion location ── */}
      <Section label="Ubicación de conversión" required description="Dónde ocurre la conversión.">
        <div className="w-convgrid" role="radiogroup" aria-label="Ubicación de conversión">
          {CONVERSION_LOCATIONS.map((c) => {
            const Icon: React.ElementType = c.value === "website" ? Monitor : MessageCircle;
            return (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={d.conversionLocation === c.value}
                className="w-conv"
                disabled={!c.available}
                title={c.available ? c.label : `${c.label} — próximamente`}
                onClick={() => patchDelivery({ conversionLocation: c.value as ConversionLocation })}
              >
                <span className="w-conv__icon"><Icon size={18} strokeWidth={2} aria-hidden="true" /></span>
                <span className="w-conv__label">{c.label}</span>
                {!c.available && <span className="w-badge w-badge--soon">Próximamente</span>}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── 2 · Destination (Mundo Academy requirement) ── */}
      <Section
        label="Destino"
        required
        description="A dónde llevan los anuncios. Define la URL de destino de la campaña."
        error={errors.productId ?? errors.paymentLinkId ?? errors.customUrl}
      >
        <div className="w-destrow" role="radiogroup" aria-label="Tipo de destino">
          {([
            { value: "product", label: "Producto", icon: Package },
            { value: "payment_link", label: "Enlace de pago", icon: Link2 },
            { value: "url", label: "URL", icon: Globe },
          ] as { value: DestinationKind; label: string; icon: React.ElementType }[]).map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={draft.destinationKind === k.value}
              className="w-segbtn"
              onClick={() => onChange({ destinationKind: k.value })}
            >
              <k.icon size={15} strokeWidth={2} aria-hidden="true" />
              {k.label}
            </button>
          ))}
        </div>

        {draft.destinationKind === "product" && (
          products.length === 0 ? (
            <span className="w-desc">Este negocio todavía no tiene productos. Usa una URL personalizada.</span>
          ) : (
            <select
              className="w-select w-select--block"
              value={draft.productId ?? ""}
              aria-invalid={errors.productId ? true : undefined}
              onChange={(e) => onChange({ productId: e.target.value || null })}
            >
              <option value="">Selecciona un producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.price > 0 ? ` · ${p.price} ${p.currency}` : ""}
                  {p.status !== "published" ? " (borrador)" : ""}
                </option>
              ))}
            </select>
          )
        )}

        {draft.destinationKind === "payment_link" && (
          !paymentLinksAvailable ? (
            <span className="w-desc">Los enlaces de pago aún no están configurados.</span>
          ) : paymentLinks.length === 0 ? (
            <span className="w-desc">Todavía no has creado enlaces de pago.</span>
          ) : (
            <select
              className="w-select w-select--block"
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
          )
        )}

        {draft.destinationKind === "url" && (
          <input
            type="text"
            inputMode="url"
            className="w-input"
            value={draft.customUrl}
            placeholder="https://tu-web.com/oferta"
            aria-invalid={errors.customUrl ? true : undefined}
            onChange={(e) => onChange({ customUrl: e.target.value })}
          />
        )}
      </Section>

      {/* ── 3 · Conversion event ── */}
      <Section
        label="Evento de conversión"
        required
        isField
        labelFor={eventId}
        error={errors.conversionEvent}
      >
        <select
          id={eventId}
          className="w-select w-select--block"
          value={d.conversionEvent}
          aria-invalid={errors.conversionEvent ? true : undefined}
          onChange={(e) => patchDelivery({ conversionEvent: e.target.value })}
        >
          <option value="">Selecciona un evento de conversión</option>
          {CONVERSION_EVENTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Section>

      {/* ── 4 · Geo targeting ── */}
      <Section label="Segmentación geográfica" error={errors.includedLocations}>
        <div className="w-togglerow">
          <span className="w-togglerow__label">
            <Globe size={18} strokeWidth={2} aria-hidden="true" />
            Alcance global
          </span>
          <Switch
            checked={a.globalReach}
            onChange={(globalReach) => patchAudience({ globalReach })}
            label="Alcance global"
          />
        </div>

        {!a.globalReach && (
          <div className="w-geo">
            <div className="w-segmented" role="tablist" aria-label="Incluir o excluir ubicaciones">
              {([["include", "Objetivo"], ["exclude", "Excluir"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={geoTab === k}
                  className="w-segtab"
                  onClick={() => setGeoTab(k)}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              type="text"
              className="w-input"
              value={geoQuery}
              placeholder="Busca países, regiones o ciudades"
              aria-label="Busca países, regiones o ciudades"
              onChange={(e) => setGeoQuery(e.target.value)}
            />

            {suggestions.length > 0 && (
              <ul className="w-geosuggest">
                {suggestions.map((sug) => (
                  <li key={sug}>
                    <button type="button" className="w-geosuggest__item" onClick={() => addLocation(sug)}>
                      {sug}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {activeList.length > 0 && (
              <div className="w-geochips">
                {activeList.map((loc) => (
                  <span className="w-geochip" key={loc}>
                    {loc}
                    <button type="button" aria-label={`Quitar ${loc}`} onClick={() => removeLocation(loc)}>
                      <X size={13} strokeWidth={2.4} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="w-georow">
              {/* Dotted globe — a light local rendering, no map library and no
                  fabricated geo data. */}
              <div className="w-globe" aria-hidden="true">
                {Array.from({ length: 132 }, (_, i) => <span key={i} />)}
              </div>
              <button
                type="button"
                className="w-linkbtn"
                onClick={clearAll}
                disabled={a.includedLocations.length === 0 && a.excludedLocations.length === 0}
              >
                Borrar todo
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* ── 5 · Advantage+ audience ── */}
      <Section label="Automatizaciones de Meta">
        <RecommendationCard
          title="Audiencia Advantage+"
          description="Deja que Meta encuentre la mejor audiencia para tus anuncios."
          checked={a.advantageAudience}
          onChange={(advantageAudience) => patchAudience({ advantageAudience })}
        >
          <div className="w-recorow">
            <label className="w-recorow__label" htmlFor={minAgeId}>Edad mínima</label>
            <select
              id={minAgeId}
              className="w-select"
              value={a.ageMin}
              onChange={(e) => patchAudience({ ageMin: Number(e.target.value) })}
            >
              {MIN_AGE_OPTIONS.map((v) => (
                <option key={v} value={v}>{v}+</option>
              ))}
            </select>
          </div>
        </RecommendationCard>

        {/* Manual targeting only surfaces when the automation is off — the
            fields already existed in the wizard and stay persisted either way. */}
        {!a.advantageAudience && (
          <div className="w-manual">
            <div className="w-manual__grid">
              <div className="w-section" data-field="true">
                <span className="w-label">Edad máxima</span>
                <input
                  type="number"
                  className="w-input"
                  value={a.ageMax}
                  min={AGE_MIN}
                  max={AGE_MAX}
                  aria-invalid={errors.ageMax ? true : undefined}
                  onChange={(e) => patchAudience({ ageMax: Number(e.target.value) })}
                />
                {errors.ageMax && <span className="w-error" role="alert">{errors.ageMax}</span>}
              </div>
              <div className="w-section" data-field="true">
                <span className="w-label">Género</span>
                <select
                  className="w-select w-select--block"
                  value={a.gender}
                  onChange={(e) => patchAudience({ gender: e.target.value as Gender })}
                >
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="w-section" data-field="true">
                <span className="w-label">Idioma</span>
                <select
                  className="w-select w-select--block"
                  value={a.language}
                  onChange={(e) => patchAudience({ language: e.target.value })}
                >
                  {LANGUAGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ── 6 · Advantage+ placements ── */}
      <Section label="Ubicaciones">
        <RecommendationCard
          title="Advantage+ placements"
          description="Meta mostrará tus anuncios en las ubicaciones con mejores resultados."
          checked={d.advantagePlacements}
          onChange={(advantagePlacements) => patchDelivery({ advantagePlacements })}
        />
        {!d.advantagePlacements && (
          <span className="w-desc">
            La selección manual de ubicaciones se habilitará al conectar la cuenta publicitaria.
          </span>
        )}
      </Section>

      {/* ── 7 · Schedule ── */}
      <Section label="Calendario" description="Cuándo se entrega la campaña. El importe diario se define en Campaign.">
        <div className="w-schedgrid">
          <div className="w-section" data-field="true">
            <span className="w-label">Moneda</span>
            <select
              className="w-select w-select--block"
              value={draft.currency}
              onChange={(e) => onChange({ currency: e.target.value })}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="w-section" data-field="true">
            <span className="w-label">Zona horaria</span>
            <select
              className="w-select w-select--block"
              value={draft.timezone}
              onChange={(e) => onChange({ timezone: e.target.value })}
            >
              {TIMEZONE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="w-section" data-field="true">
            <span className="w-label">Fecha de inicio <span className="w-req" aria-hidden="true">*</span></span>
            <input
              type="date"
              className="w-input"
              value={draft.startsAt}
              aria-invalid={errors.startsAt ? true : undefined}
              onChange={(e) => onChange({ startsAt: e.target.value })}
            />
            {errors.startsAt && <span className="w-error" role="alert">{errors.startsAt}</span>}
          </div>
          <div className="w-section" data-field="true">
            <span className="w-label">Fecha de fin</span>
            <input
              type="date"
              className="w-input"
              value={draft.endsAt}
              min={draft.startsAt || undefined}
              aria-invalid={errors.endsAt ? true : undefined}
              onChange={(e) => onChange({ endsAt: e.target.value })}
            />
            {errors.endsAt && <span className="w-error" role="alert">{errors.endsAt}</span>}
          </div>
        </div>
      </Section>
    </div>
  );
}
