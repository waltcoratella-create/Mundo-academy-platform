"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  Globe, Monitor, MessageCircle, Package, Link2, X, ChevronDown, Search,
  Loader2, AlertCircle, Lock,
} from "lucide-react";
import type {
  CampaignAudience, CampaignCustomAudience, CampaignDelivery, CampaignDraft,
  CampaignGeoLocation, CampaignInterest, ConversionLocation, DestinationKind,
  Errors, Gender, MetaAccountBinding,
} from "../campaign-types";
import {
  CONVERSION_LOCATIONS, CONVERSION_EVENTS, MIN_AGE_OPTIONS,
  CURRENCY_OPTIONS, TIMEZONE_OPTIONS, GENDER_OPTIONS, LANGUAGE_OPTIONS,
  AGE_MIN, AGE_MAX, GEO_DEBOUNCE_MS, GEO_MIN_QUERY, INTEREST_MIN_QUERY,
  geoLocationContext, geoLocationId,
  interestContext, interestId, customAudienceContext, customAudienceId,
} from "../campaign-types";
import { searchGeoLocations } from "../geo-actions";
import { searchInterests, loadCustomAudiences } from "../audience-actions";

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$", EUR: "€", MXN: "$", ARS: "$", COP: "$", CLP: "$", BRL: "R$",
};
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
  businessId,
  metaAccount,
  products,
  paymentLinks,
  paymentLinksAvailable,
  onChange,
}: {
  draft: CampaignDraft;
  errors: Errors;
  /** Needed by the geo search action, which re-checks ownership server-side. */
  businessId: string;
  metaAccount: MetaAccountBinding;
  products: ProductOption[];
  paymentLinks: PaymentLinkOption[];
  paymentLinksAvailable: boolean;
  onChange: (patch: Partial<CampaignDraft>) => void;
}) {
  const eventId = useId();
  const minAgeId = useId();
  const startId = useId();
  const tzId = useId();
  const currencyId = useId();
  const minSpendId = useId();
  const metaLockId = useId();
  const advancedId = useId();
  const [geoTab, setGeoTab] = useState<"include" | "exclude">("include");
  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState<CampaignGeoLocation[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [audTab, setAudTab] = useState<"include" | "exclude">("include");
  const [audQuery, setAudQuery] = useState("");
  const [intQuery, setIntQuery] = useState("");
  const [intResults, setIntResults] = useState<CampaignInterest[]>([]);
  const [intLoading, setIntLoading] = useState(false);
  const [intError, setIntError] = useState<string | null>(null);
  const [audAll, setAudAll] = useState<CampaignCustomAudience[] | null>(null);
  const [audLoading, setAudLoading] = useState(false);
  const [audError, setAudError] = useState<string | null>(null);
  const [audNeedsTos, setAudNeedsTos] = useState(false);
  const [langQuery, setLangQuery] = useState("");

  const a = draft.audience;
  const d = draft.delivery;

  function patchAudience(patch: Partial<CampaignAudience>) {
    onChange({ audience: { ...a, ...patch } });
  }
  function patchDelivery(patch: Partial<CampaignDelivery>) {
    onChange({ delivery: { ...d, ...patch } });
  }

  const activeList = geoTab === "include" ? a.includedLocations : a.excludedLocations;
  const hasEndDate = Boolean(draft.endsAt);
  const symbol = CURRENCY_SYMBOL[draft.currency] ?? draft.currency;

  // Knowing the account locks currency/zone; only a usable credential enables
  // the live geo search. An expired authorisation keeps the first and loses the
  // second.
  const metaBound = metaAccount.bound;
  // Shared by geo, interests and custom audiences: all three need a usable
  // credential, none of them needs anything geo-specific.
  const metaApiAvailable = metaAccount.apiAvailable;
  const metaNeedsReconnect = metaBound && !metaApiAvailable;
  const settingsHref = `/mis-negocios/${businessId}/configuraciones`;

  // The ad account's zone/currency may not be in the curated lists; showing a
  // select whose value is absent would render blank, so they are prepended.
  const timezoneOptions = useMemo(
    () => (TIMEZONE_OPTIONS.includes(draft.timezone)
      ? TIMEZONE_OPTIONS
      : [draft.timezone, ...TIMEZONE_OPTIONS]),
    [draft.timezone]
  );
  const currencyOptions = useMemo(
    () => (CURRENCY_OPTIONS.includes(draft.currency)
      ? CURRENCY_OPTIONS
      : [draft.currency, ...CURRENCY_OPTIONS]),
    [draft.currency]
  );

  /** Ticking "set an end date" needs a sensible starting value. */
  const suggestedEnd = useMemo(() => {
    const from = draft.startsAt ? new Date(draft.startsAt) : new Date();
    if (Number.isNaN(from.getTime())) return "";
    from.setDate(from.getDate() + 7);
    return from.toISOString().slice(0, 16);
  }, [draft.startsAt]);

  const langSuggestions = useMemo(() => {
    const q = langQuery.trim().toLowerCase();
    if (!q) return [];
    return LANGUAGE_OPTIONS.filter(
      (l) => l.label.toLowerCase().includes(q) && !a.languages.includes(l.value)
    ).slice(0, 6);
  }, [langQuery, a.languages]);

  /**
   * Debounced Meta lookup.
   *
   * Every keystroke would otherwise be a Marketing API call and the app's access
   * tier is rate limited, so a request only leaves after the user pauses and
   * only from the second character on. There is no local fallback list: without
   * Meta there are no real keys, and a name without a key is not publishable.
   */
  useEffect(() => {
    const q = geoQuery.trim();
    if (!metaApiAvailable || q.length < GEO_MIN_QUERY) {
      setGeoResults([]);
      setGeoError(null);
      setGeoLoading(false);
      return;
    }

    let cancelled = false;
    setGeoLoading(true);

    const timer = setTimeout(() => {
      searchGeoLocations(businessId, q)
        .then((res) => {
          if (cancelled) return;
          if (res.ok) {
            setGeoResults(res.results);
            setGeoError(null);
          } else {
            setGeoResults([]);
            setGeoError(res.error);
          }
        })
        .catch(() => {
          if (cancelled) return;
          setGeoResults([]);
          setGeoError("No se pudieron buscar ubicaciones en Meta. Inténtalo de nuevo.");
        })
        .finally(() => {
          if (!cancelled) setGeoLoading(false);
        });
    }, GEO_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [geoQuery, metaApiAvailable, businessId]);

  /** Hide what is already on the active tab, without re-querying Meta. */
  const geoSuggestions = useMemo(() => {
    const taken = new Set(activeList.map(geoLocationId));
    return geoResults.filter((r) => !taken.has(geoLocationId(r)));
  }, [geoResults, activeList]);

  function addLocation(loc: CampaignGeoLocation) {
    const field = geoTab === "include" ? "includedLocations" : "excludedLocations";
    if (activeList.some((l) => geoLocationId(l) === geoLocationId(loc))) return;
    patchAudience({ [field]: [...activeList, loc] } as Partial<CampaignAudience>);
    setGeoQuery("");
    setGeoResults([]);
  }
  function removeLocation(id: string) {
    const field = geoTab === "include" ? "includedLocations" : "excludedLocations";
    patchAudience({
      [field]: activeList.filter((l) => geoLocationId(l) !== id),
    } as Partial<CampaignAudience>);
  }
  function clearAll() {
    patchAudience({ includedLocations: [], excludedLocations: [] });
  }

  // ── Interests ──────────────────────────────────────────────────────────────

  /**
   * Same shape as the geo lookup: debounced, gated on a usable credential and
   * on a minimum query, with no local list behind it.
   */
  useEffect(() => {
    const q = intQuery.trim();
    if (!metaApiAvailable || q.length < INTEREST_MIN_QUERY) {
      setIntResults([]);
      setIntError(null);
      setIntLoading(false);
      return;
    }

    let cancelled = false;
    setIntLoading(true);

    const timer = setTimeout(() => {
      searchInterests(businessId, q)
        .then((res) => {
          if (cancelled) return;
          if (res.ok) { setIntResults(res.results); setIntError(null); }
          else { setIntResults([]); setIntError(res.error); }
        })
        .catch(() => {
          if (cancelled) return;
          setIntResults([]);
          setIntError("No se pudieron buscar intereses en Meta. Inténtalo de nuevo.");
        })
        .finally(() => { if (!cancelled) setIntLoading(false); });
    }, GEO_DEBOUNCE_MS);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [intQuery, metaApiAvailable, businessId]);

  const interestSuggestions = useMemo(() => {
    const taken = new Set(a.interests.map(interestId));
    return intResults.filter((r) => !taken.has(interestId(r)));
  }, [intResults, a.interests]);

  function addInterest(item: CampaignInterest) {
    if (a.interests.some((i) => interestId(i) === interestId(item))) return;
    patchAudience({ interests: [...a.interests, item] });
    setIntQuery("");
    setIntResults([]);
  }
  function removeInterest(id: string) {
    patchAudience({ interests: a.interests.filter((i) => interestId(i) !== id) });
  }

  // ── Custom Audiences ───────────────────────────────────────────────────────

  /**
   * One listing per Build step, then filtered in the browser. An account holds
   * tens of audiences, so turning each keystroke into a Graph call would spend
   * a rate-limited tier for nothing — and the filter keeps working if Meta
   * becomes unreachable afterwards.
   */
  useEffect(() => {
    if (!metaApiAvailable || audAll !== null) return;

    let cancelled = false;
    setAudLoading(true);

    loadCustomAudiences(businessId)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setAudAll(res.audiences);
          setAudError(null);
          setAudNeedsTos(false);
        } else {
          setAudAll([]);
          setAudError(res.error);
          setAudNeedsTos(Boolean(res.needsTos));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAudAll([]);
        setAudError("No se pudieron cargar las audiencias de Meta.");
      })
      .finally(() => { if (!cancelled) setAudLoading(false); });

    return () => { cancelled = true; };
  }, [metaApiAvailable, audAll, businessId]);

  const activeAudiences =
    audTab === "include" ? a.customAudiencesIncluded : a.customAudiencesExcluded;

  /** Client-side filter over the single listing. */
  const audienceSuggestions = useMemo(() => {
    if (!audAll) return [];
    const q = audQuery.trim().toLowerCase();
    const taken = new Set(activeAudiences.map(customAudienceId));
    return audAll
      .filter((x) => !taken.has(customAudienceId(x)))
      .filter((x) => !q || x.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [audAll, audQuery, activeAudiences]);

  function addAudience(item: CampaignCustomAudience) {
    const field = audTab === "include" ? "customAudiencesIncluded" : "customAudiencesExcluded";
    if (activeAudiences.some((x) => customAudienceId(x) === customAudienceId(item))) return;
    patchAudience({ [field]: [...activeAudiences, item] } as Partial<CampaignAudience>);
    setAudQuery("");
  }
  function removeAudience(id: string) {
    const field = audTab === "include" ? "customAudiencesIncluded" : "customAudiencesExcluded";
    patchAudience({
      [field]: activeAudiences.filter((x) => customAudienceId(x) !== id),
    } as Partial<CampaignAudience>);
  }

  /**
   * Re-run the listing after a failure.
   *
   * Clearing `audAll` is what re-arms the effect above, so the retry goes
   * through the same server action rather than reloading the page. Audiences
   * already picked live in the draft, not in this list, so they are untouched.
   */
  function retryAudiences() {
    setAudError(null);
    setAudNeedsTos(false);
    setAudAll(null);
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
              placeholder={
                metaApiAvailable
                  ? "Busca países, regiones o ciudades"
                  : "Conecta Meta para buscar ubicaciones"
              }
              aria-label="Busca países, regiones o ciudades"
              disabled={!metaApiAvailable}
              onChange={(e) => setGeoQuery(e.target.value)}
            />

            {!metaApiAvailable && (
              <p className="w-geohint w-geohint--warn">
                <AlertCircle size={13} strokeWidth={2} aria-hidden="true" />
                <span>
                  {metaNeedsReconnect ? (
                    <>
                      La autorización con Meta caducó, así que no se pueden buscar
                      ubicaciones.{" "}
                      <Link href={settingsHref} className="w-geolink">
                        Vuelve a conectar en Configuraciones
                      </Link>
                      . Las ubicaciones ya guardadas se conservan.
                    </>
                  ) : (
                    <>
                      Las ubicaciones se buscan en Meta.{" "}
                      <Link href={settingsHref} className="w-geolink">
                        Conecta tu cuenta en Configuraciones
                      </Link>{" "}
                      para segmentar por ubicación.
                    </>
                  )}
                </span>
              </p>
            )}

            {geoLoading && (
              <p className="w-geohint" role="status">
                <Loader2 size={13} strokeWidth={2} className="w-spin" aria-hidden="true" />
                <span>Buscando en Meta…</span>
              </p>
            )}

            {geoError && (
              <p className="w-geohint w-geohint--warn" role="alert">
                <AlertCircle size={13} strokeWidth={2} aria-hidden="true" />
                <span>{geoError}</span>
              </p>
            )}

            {metaApiAvailable && !geoLoading && !geoError
              && geoQuery.trim().length >= GEO_MIN_QUERY
              && geoSuggestions.length === 0 && (
              <p className="w-geohint">
                <span>Meta no devolvió ubicaciones para «{geoQuery.trim()}».</span>
              </p>
            )}

            {geoSuggestions.length > 0 && (
              <ul className="w-geosuggest">
                {geoSuggestions.map((sug) => {
                  const context = geoLocationContext(sug);
                  return (
                    <li key={geoLocationId(sug)}>
                      <button
                        type="button"
                        className="w-geosuggest__item"
                        onClick={() => addLocation(sug)}
                      >
                        <span className="w-geosuggest__name">{sug.name}</span>
                        {context && <span className="w-geosuggest__meta">{context}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {activeList.length > 0 && (
              <div className="w-geochips">
                {activeList.map((loc) => {
                  const id = geoLocationId(loc);
                  const context = geoLocationContext(loc);
                  return (
                    <span
                      className="w-geochip"
                      key={id}
                      data-unresolved={loc.key ? undefined : "true"}
                    >
                      <span className="w-geochip__text">
                        {loc.name}
                        {context && <span className="w-geochip__meta">{context}</span>}
                        {!loc.key && (
                          <span
                            className="w-geochip__badge"
                            title="Guardada antes de la búsqueda de Meta: no tiene identificador. Vuelve a seleccionarla para poder publicarla."
                          >
                            Pendiente de confirmar
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        aria-label={`Quitar ${loc.name}`}
                        onClick={() => removeLocation(id)}
                      >
                        <X size={13} strokeWidth={2.4} />
                      </button>
                    </span>
                  );
                })}
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
            </div>

            {/* Detailed targeting. Lives here, and only here, because Meta
                largely ignores manual interests while Advantage+ is on —
                offering the search there would be offering a dead control. The
                stored list survives the toggle either way. */}
            <div className="w-section" data-field="true">
              <span className="w-label">Intereses</span>
              <span className="w-desc">
                Segmentación detallada. Los intereses vienen de Meta.
              </span>

              <input
                type="text"
                className="w-input"
                value={intQuery}
                placeholder={
                  metaApiAvailable
                    ? "Busca intereses (fitness, marketing, viajes…)"
                    : "Conecta Meta para buscar intereses"
                }
                aria-label="Busca intereses"
                disabled={!metaApiAvailable}
                onChange={(e) => setIntQuery(e.target.value)}
              />

              {!metaApiAvailable && (
                <p className="w-geohint w-geohint--warn">
                  <AlertCircle size={13} strokeWidth={2} aria-hidden="true" />
                  <span>
                    {metaNeedsReconnect
                      ? "La autorización con Meta caducó. Los intereses guardados se conservan."
                      : "Los intereses se buscan en Meta."}{" "}
                    <Link href={settingsHref} className="w-geolink">
                      Ir a Configuraciones
                    </Link>
                  </span>
                </p>
              )}

              {intLoading && (
                <p className="w-geohint" role="status">
                  <Loader2 size={13} strokeWidth={2} className="w-spin" aria-hidden="true" />
                  <span>Buscando en Meta…</span>
                </p>
              )}

              {intError && (
                <p className="w-geohint w-geohint--warn" role="alert">
                  <AlertCircle size={13} strokeWidth={2} aria-hidden="true" />
                  <span>{intError}</span>
                </p>
              )}

              {metaApiAvailable && !intLoading && !intError
                && intQuery.trim().length >= INTEREST_MIN_QUERY
                && interestSuggestions.length === 0 && (
                <p className="w-geohint">
                  <span>Meta no devolvió intereses para «{intQuery.trim()}».</span>
                </p>
              )}

              {interestSuggestions.length > 0 && (
                <ul className="w-geosuggest">
                  {interestSuggestions.map((item) => {
                    const context = interestContext(item);
                    return (
                      <li key={interestId(item)}>
                        <button
                          type="button"
                          className="w-geosuggest__item"
                          onClick={() => addInterest(item)}
                        >
                          <span className="w-geosuggest__name">{item.name}</span>
                          {context && <span className="w-geosuggest__meta">{context}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {a.interests.length > 0 && (
                <div className="w-geochips">
                  {a.interests.map((item) => {
                    const id = interestId(item);
                    const context = interestContext(item);
                    return (
                      <span
                        className="w-geochip"
                        key={id}
                        data-unresolved={item.id ? undefined : "true"}
                      >
                        <span className="w-geochip__text">
                          {item.name}
                          {context && <span className="w-geochip__meta">{context}</span>}
                          {!item.id && (
                            <span
                              className="w-geochip__badge"
                              title="Guardado antes de la búsqueda de Meta: no tiene identificador. Vuelve a seleccionarlo para poder publicarlo."
                            >
                              Pendiente de confirmar
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          aria-label={`Quitar ${item.name}`}
                          onClick={() => removeInterest(id)}
                        >
                          <X size={13} strokeWidth={2.4} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advantage+ hides the manual controls but never discards them. */}
        {a.advantageAudience && a.interests.length > 0 && (
          <p className="w-geohint">
            <span>
              {a.interests.length === 1
                ? "1 interés guardado se aplicará si desactivas Advantage+."
                : `${a.interests.length} intereses guardados se aplicarán si desactivas Advantage+.`}
            </span>
          </p>
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

      {/* ── 7 · Advanced options ── */}
      <div className="w-section">
        <button
          type="button"
          className="w-advtoggle"
          aria-expanded={advancedOpen}
          aria-controls={advancedId}
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <ChevronDown className="w-advtoggle__chev" size={18} strokeWidth={2} aria-hidden="true" />
          Opciones avanzadas
        </button>

        {advancedOpen && (
          <div className="w-advpanel" id={advancedId}>
            {/* 7.1 · Horario — reuses startsAt / endsAt / timezone. */}
            <div className="w-advblock">
              <div className="w-advblock__head">
                <span className="w-advblock__title">Horario</span>
                <span className="w-advblock__desc">Fechas de inicio y finalización</span>
              </div>
              <div className="w-schedrow">
                <div className="w-schedcol">
                  <label className="w-sublabel" htmlFor={startId}>Iniciar</label>
                  <input
                    id={startId}
                    type="datetime-local"
                    className="w-input"
                    value={draft.startsAt}
                    aria-invalid={errors.startsAt ? true : undefined}
                    onChange={(e) => onChange({ startsAt: e.target.value })}
                  />
                  {errors.startsAt && <span className="w-error" role="alert">{errors.startsAt}</span>}
                </div>
                <div className="w-schedcol">
                  <label className="w-checkrow">
                    <input
                      type="checkbox"
                      className="w-checkbox"
                      checked={hasEndDate}
                      onChange={(e) => onChange({ endsAt: e.target.checked ? suggestedEnd : "" })}
                    />
                    Establecer una fecha de finalización
                  </label>
                  <input
                    type="datetime-local"
                    className="w-input"
                    value={draft.endsAt}
                    min={draft.startsAt || undefined}
                    disabled={!hasEndDate}
                    aria-invalid={errors.endsAt ? true : undefined}
                    onChange={(e) => onChange({ endsAt: e.target.value })}
                  />
                  {errors.endsAt && <span className="w-error" role="alert">{errors.endsAt}</span>}
                </div>
              </div>
              <span className="w-advblock__note">
                Los horarios utilizan {draft.timezone.replace(/_/g, " ")}.
              </span>
              <div className="w-schedrow">
                <div className="w-schedcol">
                  <label className="w-sublabel" htmlFor={tzId}>Zona horaria</label>
                  <select
                    id={tzId}
                    className="w-select w-select--block"
                    value={draft.timezone}
                    disabled={metaBound}
                    aria-describedby={metaBound ? metaLockId : undefined}
                    onChange={(e) => onChange({ timezone: e.target.value })}
                  >
                    {timezoneOptions.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="w-schedcol">
                  <label className="w-sublabel" htmlFor={currencyId}>Moneda</label>
                  <select
                    id={currencyId}
                    className="w-select w-select--block"
                    value={draft.currency}
                    disabled={metaBound}
                    aria-describedby={metaBound ? metaLockId : undefined}
                    onChange={(e) => onChange({ currency: e.target.value })}
                  >
                    {currencyOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Meta reads the budget in the ad account's own currency and
                  schedules in its own zone, so when an account is connected it
                  is the source of truth and both controls are locked. */}
              {metaBound && (
                <p className="w-geohint" id={metaLockId}>
                  <Lock size={13} strokeWidth={2} aria-hidden="true" />
                  <span>
                    Moneda y zona horaria vienen de tu cuenta publicitaria de Meta
                    {metaAccount.adAccountName ? ` (${metaAccount.adAccountName})` : ""}.{" "}
                    <Link href={settingsHref} className="w-geolink">
                      Cámbialas en Configuraciones
                    </Link>
                    .
                  </span>
                </p>
              )}
            </div>

            {/* 7.2 · Gasto mínimo diario — ad-set floor, NOT Campaign's budget. */}
            <div className="w-advblock">
              <div className="w-advblock__head">
                <label className="w-advblock__title" htmlFor={minSpendId}>Gasto mínimo diario</label>
                <span className="w-advblock__desc">
                  Objetivo de gasto opcional para este grupo de anuncios, no es una garantía.
                </span>
              </div>
              <div className="w-inputwrap">
                <span className="w-affix" aria-hidden="true">{symbol}</span>
                <input
                  id={minSpendId}
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  className="w-input w-input--affixed"
                  placeholder="0"
                  value={d.minimumDailySpend ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    patchDelivery({ minimumDailySpend: v === "" ? null : Number(v) });
                  }}
                />
                <span className="w-affix w-affix--suffix" aria-hidden="true">/día</span>
              </div>
            </div>

            {/* 7.3 · Meta Custom Audiences — real UI, no fabricated entries. */}
            <div className="w-advblock">
              <div className="w-advblock__head w-advblock__head--row">
                <div className="w-advblock__texts">
                  <span className="w-advblock__title">Audiencias</span>
                  <span className="w-advblock__desc">
                    Dirígete o excluye tus audiencias. Crea similitudes desde la página de
                    configuración de anuncios.
                  </span>
                </div>
                <span
                  className="w-linkbtn"
                  data-disabled="true"
                  aria-disabled="true"
                  title="Subir audiencias por CSV todavía no está implementado"
                >
                  Cargar CSV
                </span>
              </div>
              <div className="w-audrow">
                <div className="w-segmented" role="tablist" aria-label="Incluir o excluir audiencias">
                  {([["include", "Incluir"], ["exclude", "Excluir"]] as const).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      aria-selected={audTab === k}
                      className="w-segtab"
                      onClick={() => setAudTab(k)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="w-searchwrap">
                  <Search size={16} strokeWidth={2} aria-hidden="true" />
                  <input
                    type="text"
                    className="w-searchinput"
                    placeholder={
                      !metaApiAvailable
                        ? "Conecta Meta para ver tus audiencias"
                        : audTab === "include"
                          ? "Buscar audiencias para incluir"
                          : "Buscar audiencias para excluir"
                    }
                    value={audQuery}
                    disabled={!metaApiAvailable}
                    onChange={(e) => setAudQuery(e.target.value)}
                  />
                </div>
              </div>

              {!metaApiAvailable && (
                <p className="w-geohint w-geohint--warn">
                  <AlertCircle size={13} strokeWidth={2} aria-hidden="true" />
                  <span>
                    {metaNeedsReconnect
                      ? "La autorización con Meta caducó. Las audiencias ya elegidas se conservan."
                      : "Tus audiencias guardadas se leen de tu cuenta publicitaria de Meta."}{" "}
                    <Link href={settingsHref} className="w-geolink">
                      Ir a Configuraciones
                    </Link>
                  </span>
                </p>
              )}

              {audLoading && (
                <p className="w-geohint" role="status">
                  <Loader2 size={13} strokeWidth={2} className="w-spin" aria-hidden="true" />
                  <span>Cargando tus audiencias de Meta…</span>
                </p>
              )}

              {/* The Custom Audience terms are accepted per person and business,
                  and Meta refuses the edge until then. The message is Meta's own
                  and the link is the one that actually resolves it. */}
              {audError && (
                <p className="w-geohint w-geohint--warn" role="alert">
                  <AlertCircle size={13} strokeWidth={2} aria-hidden="true" />
                  <span>
                    {audError}
                    {audNeedsTos && metaAccount.adAccountId && (
                      <>
                        {" "}
                        <a
                          className="w-geolink"
                          href={`https://business.facebook.com/ads/manage/customaudiences/tos/?act=${metaAccount.adAccountId.replace(/^act_/, "")}`}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Aceptar las condiciones de Custom Audiences
                        </a>
                        .
                      </>
                    )}{" "}
                    <button
                      type="button"
                      className="w-geolink w-geolink--btn"
                      onClick={retryAudiences}
                      disabled={audLoading}
                    >
                      Reintentar
                    </button>
                  </span>
                </p>
              )}

              {/* An account with no saved audiences is a real, ordinary state —
                  said plainly rather than dressed up as a failure. */}
              {metaApiAvailable && !audLoading && !audError && audAll?.length === 0 && (
                <p className="w-geohint">
                  <span>Esta cuenta publicitaria todavía no tiene audiencias guardadas en Meta.</span>
                </p>
              )}

              {metaApiAvailable && !audLoading && !audError
                && (audAll?.length ?? 0) > 0 && audienceSuggestions.length === 0 && (
                <p className="w-geohint">
                  <span>
                    {audQuery.trim()
                      ? `Ninguna audiencia coincide con «${audQuery.trim()}».`
                      : "Todas tus audiencias ya están en esta lista."}
                  </span>
                </p>
              )}

              {audienceSuggestions.length > 0 && (
                <ul className="w-geosuggest">
                  {audienceSuggestions.map((item) => {
                    const context = customAudienceContext(item);
                    return (
                      <li key={customAudienceId(item)}>
                        <button
                          type="button"
                          className="w-geosuggest__item"
                          onClick={() => addAudience(item)}
                        >
                          <span className="w-geosuggest__name">{item.name}</span>
                          {context && <span className="w-geosuggest__meta">{context}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {activeAudiences.length > 0 && (
                <div className="w-geochips">
                  {activeAudiences.map((item) => {
                    const id = customAudienceId(item);
                    const context = customAudienceContext(item);
                    return (
                      <span
                        className="w-geochip"
                        key={id}
                        data-unresolved={item.id ? undefined : "true"}
                      >
                        <span className="w-geochip__text">
                          {item.name}
                          {context && <span className="w-geochip__meta">{context}</span>}
                          {!item.id && (
                            <span
                              className="w-geochip__badge"
                              title="Guardada antes de leer las audiencias de Meta: no tiene identificador. Vuelve a seleccionarla para poder publicarla."
                            >
                              Pendiente de confirmar
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          aria-label={`Quitar ${item.name}`}
                          onClick={() => removeAudience(id)}
                        >
                          <X size={13} strokeWidth={2.4} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 7.4 · Creatividad dinámica */}
            <div className="w-advblock">
              <div className="w-advblock__head w-advblock__head--row">
                <div className="w-advblock__texts">
                  <span className="w-advblock__title">Creatividad dinámica</span>
                  <span className="w-advblock__desc">
                    Deja que Meta combine automáticamente tus medios y texto en variaciones de
                    anuncios a las que es probable que responda tu audiencia.
                  </span>
                </div>
                <Switch
                  checked={d.dynamicCreative}
                  onChange={(dynamicCreative) => patchDelivery({ dynamicCreative })}
                  label="Creatividad dinámica"
                />
              </div>
            </div>

            {/* 7.5 · Idiomas — reuses audience.languages. */}
            <div className="w-advblock">
              <div className="w-advblock__head">
                <span className="w-advblock__title">Idiomas</span>
                <span className="w-advblock__desc">
                  Deja en blanco para dirigirte a todos los idiomas
                </span>
              </div>
              <div className="w-searchwrap">
                <Search size={16} strokeWidth={2} aria-hidden="true" />
                <input
                  type="text"
                  className="w-searchinput"
                  placeholder="Busca un idioma (por ejemplo, inglés, español)"
                  aria-label="Busca un idioma"
                  value={langQuery}
                  onChange={(e) => setLangQuery(e.target.value)}
                />
              </div>
              {langSuggestions.length > 0 && (
                <ul className="w-geosuggest">
                  {langSuggestions.map((l) => (
                    <li key={l.value}>
                      <button
                        type="button"
                        className="w-geosuggest__item"
                        onClick={() => {
                          patchAudience({ languages: [...a.languages, l.value] });
                          setLangQuery("");
                        }}
                      >
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {a.languages.length > 0 && (
                <div className="w-geochips">
                  {a.languages.map((code) => (
                    <span className="w-geochip" key={code}>
                      {LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? code}
                      <button
                        type="button"
                        aria-label={`Quitar ${code}`}
                        onClick={() =>
                          patchAudience({ languages: a.languages.filter((x) => x !== code) })
                        }
                      >
                        <X size={13} strokeWidth={2.4} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
