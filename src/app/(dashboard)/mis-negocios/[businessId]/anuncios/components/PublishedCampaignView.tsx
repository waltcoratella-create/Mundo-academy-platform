"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, PauseCircle } from "lucide-react";
import type { CampaignPublishView } from "@/lib/meta/publish-view";
import type { MetaObjectStatus } from "@/lib/meta/published-status";
import { getPublishedCampaignStatus } from "../publish-actions";

/**
 * A published campaign, read-only.
 *
 * The builder is not offered: nothing edited here would reach Meta, so an
 * editable form would only let the local record drift from what exists there.
 */

/** effective_status values as documented for the Ad; anything else is shown verbatim. */
const EFFECTIVE_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activo",
  PAUSED: "En pausa",
  DELETED: "Eliminado",
  PENDING_REVIEW: "Pendiente de revisión",
  DISAPPROVED: "Rechazado",
  PREAPPROVED: "Preaprobado",
  PENDING_BILLING_INFO: "Pendiente de datos de facturación",
  CAMPAIGN_PAUSED: "Campaña en pausa",
  ARCHIVED: "Archivado",
  ADSET_PAUSED: "Conjunto de anuncios en pausa",
  IN_PROCESS: "En proceso",
  WITH_ISSUES: "Con incidencias",
};

const KIND_LABEL: Record<MetaObjectStatus["kind"], string> = {
  campaign: "Campaña",
  adset: "Conjunto de anuncios",
  creative: "Creativo",
  ad: "Anuncio",
};

function label(value: string | null): string {
  if (!value) return "—";
  return EFFECTIVE_STATUS_LABEL[value] ? `${EFFECTIVE_STATUS_LABEL[value]} (${value})` : value;
}

export function PublishedCampaignView({
  businessId,
  view,
  adsHref,
}: {
  businessId: string;
  view: CampaignPublishView;
  adsHref: string;
}) {
  const [objects, setObjects] = useState<MetaObjectStatus[] | null>(null);
  const [adsManagerUrl, setAdsManagerUrl] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getPublishedCampaignStatus(businessId, view.campaignId)
      .then((res) => {
        if (!alive) return;
        if (res.ok) { setObjects(res.objects); setAdsManagerUrl(res.adsManagerUrl); }
        else setStatusError(res.error);
      })
      .catch(() => alive && setStatusError("No se pudo leer el estado en Meta."));
    return () => { alive = false; };
  }, [businessId, view.campaignId]);

  const ids: Array<[string, string | null]> = [
    ["Campaña", view.metaCampaignId],
    ["Conjunto de anuncios", view.metaAdSetId],
    ...view.ads.flatMap((a, i): Array<[string, string | null]> => [
      [`Creativo ${i + 1}`, a.metaCreativeId],
      [`Anuncio ${i + 1}`, a.metaAdId],
    ]),
  ];

  return (
    <div className="adsc-shell">
      <div className="adsc-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <header>
          <p style={{ fontSize: 12, color: "#6b7280" }}>Publicada en Meta</p>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{view.name}</h1>
        </header>

        <div className="adsc-alert" data-tone="amber">
          <PauseCircle size={16} aria-hidden="true" />
          <span>
            Se creó en Meta en estado pausado y no está gastando. Esta vista es de solo lectura:
            los cambios en Mundo Academy no se sincronizan con Meta.
          </span>
        </div>

        <section>
          <h2 className="adsc-section-title">Estado local</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", fontSize: 13 }}>
            <dt>Estado</dt><dd>Publicada</dd>
            <dt>Publicada el</dt>
            <dd>{view.publishedAt ? new Date(view.publishedAt).toLocaleString("es-ES") : "—"}</dd>
            {view.dsaBeneficiaryUsed && (<><dt>Anunciante declarado</dt><dd>{view.dsaBeneficiaryUsed}</dd></>)}
            {view.dsaPayorUsed && (<><dt>Pagador declarado</dt><dd>{view.dsaPayorUsed}</dd></>)}
          </dl>
        </section>

        <section>
          <h2 className="adsc-section-title">Identificadores en Meta</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", fontSize: 13 }}>
            {ids.map(([k, v]) => (
              <Fragment key={k}><dt>{k}</dt><dd style={{ fontFamily: "monospace" }}>{v ?? "—"}</dd></Fragment>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="adsc-section-title">Estado en Meta</h2>
          {!objects && !statusError && (
            <p style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <Loader2 size={14} className="cr-ready__spin" aria-hidden="true" /> Consultando Meta…
            </p>
          )}
          {statusError && <p style={{ fontSize: 13, color: "#b91c1c" }}>{statusError}</p>}
          {objects && (
            <ul style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              {objects.map((o) => (
                <li key={`${o.kind}-${o.id}`}>
                  <strong>{KIND_LABEL[o.kind]}</strong>{" "}
                  {o.error ? (
                    <span style={{ color: "#b91c1c" }}>— {o.error}</span>
                  ) : o.kind === "creative" ? (
                    <span>— existe en Meta</span>
                  ) : (
                    <span>— estado {o.status ?? "—"} · entrega: {label(o.effectiveStatus)}</span>
                  )}
                  {o.reviewFeedback.length > 0 && (
                    <ul style={{ paddingLeft: 18, color: "#92400e" }}>
                      {o.reviewFeedback.map((f) => <li key={f}>Revisión de Meta: {f}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={adsHref} className="w-btn w-btn--ghost">Volver a Anuncios</Link>
          {adsManagerUrl && (
            <a href={adsManagerUrl} target="_blank" rel="noopener noreferrer" className="w-btn w-btn--primary">
              Abrir en el Administrador de anuncios
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          )}
        </footer>
      </div>
    </div>
  );
}
