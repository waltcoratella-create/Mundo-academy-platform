"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import type { CampaignPublishView } from "@/lib/meta/publish-view";
import { PublishConfirmModal } from "../create/components/PublishConfirmModal";

/**
 * A publish that started but did not finish.
 *
 * Read-only on purpose: some objects already exist in Meta, built from the
 * draft as it was. Editing now and resuming would assemble an ad from two
 * versions. "Reintentar" resumes from the first missing object — it never
 * recreates what exists, because every id is stored the moment Meta returns it.
 */

const STEP_LABEL: Record<string, string> = {
  campaign: "la campaña",
  adset: "el conjunto de anuncios",
  creative: "el creativo",
  ad: "el anuncio",
  done: "el cierre",
};

export function PublishIncompleteView({
  businessId,
  view,
  adsHref,
  publishDisabled,
}: {
  businessId: string;
  view: CampaignPublishView;
  adsHref: string;
  publishDisabled: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const running = view.publishState === "publishing";

  const created: Array<[string, string | null]> = [
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
          <p style={{ fontSize: 12, color: "#6b7280" }}>
            {running ? "Publicación en curso" : "Publicación incompleta"}
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{view.name}</h1>
        </header>

        {running ? (
          <div className="adsc-alert" data-tone="amber">
            <Loader2 size={16} className="cr-ready__spin" aria-hidden="true" />
            <span>
              Se está creando en Meta ahora mismo. Recarga en unos minutos para ver el resultado.
            </span>
          </div>
        ) : (
          <div className="adsc-alert" data-tone="error" role="alert" style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ display: "flex", gap: 8 }}>
              <AlertCircle size={16} aria-hidden="true" />
              <strong>
                La publicación se detuvo en {STEP_LABEL[view.publishStep ?? ""] ?? "un paso"}.
              </strong>
            </span>
            {view.publishError && <span>{view.publishError}</span>}
            <span>
              Lo ya creado en Meta está en pausa y no gasta. Al reintentar, la publicación continúa
              donde se quedó sin duplicar nada.
            </span>
          </div>
        )}

        <section>
          <h2 className="adsc-section-title">Creado en Meta hasta ahora</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", fontSize: 13 }}>
            {created.map(([k, v]) => (
              <Fragment key={k}>
                <dt>{k}</dt>
                <dd style={{ fontFamily: "monospace" }}>{v ?? "pendiente"}</dd>
              </Fragment>
            ))}
          </dl>
        </section>

        <footer style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={adsHref} className="w-btn w-btn--ghost">Volver a Anuncios</Link>
          {!running && (
            <button
              type="button"
              className="w-btn w-btn--primary"
              onClick={() => setConfirmOpen(true)}
              disabled={publishDisabled}
            >
              Reintentar
            </button>
          )}
        </footer>
        {publishDisabled && !running && (
          <p style={{ fontSize: 12, color: "#6b7280" }}>La publicación en Meta está desactivada temporalmente.</p>
        )}

        {confirmOpen && (
          <PublishConfirmModal
            businessId={businessId}
            campaignId={view.campaignId}
            onClose={() => { setConfirmOpen(false); router.refresh(); }}
            onPublished={() => { setConfirmOpen(false); router.refresh(); }}
          />
        )}
      </div>
    </div>
  );
}
