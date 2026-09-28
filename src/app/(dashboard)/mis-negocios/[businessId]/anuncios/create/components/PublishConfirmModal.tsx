"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, PauseCircle, X } from "lucide-react";
import {
  getPublishPreview, publishCampaign, type PublishPreview,
} from "../../publish-actions";

/**
 * The last screen before anything is created in Meta.
 *
 * Everything shown comes from the server's preview of the SAVED draft — the
 * same data the publish will use, stamped with a version the publish must
 * match. One option only, and it creates everything paused.
 */
export function PublishConfirmModal({
  businessId,
  campaignId,
  onClose,
  onPublished,
}: {
  businessId: string;
  campaignId: string;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [preview, setPreview] = useState<PublishPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<{ message: string; reasons?: string[] } | null>(null);

  useEffect(() => {
    let alive = true;
    getPublishPreview(businessId, campaignId)
      .then((res) => {
        if (!alive) return;
        if (res.ok) setPreview(res.preview);
        else setLoadError(res.error);
      })
      .catch(() => alive && setLoadError("No se pudo preparar la publicación."));
    return () => { alive = false; };
  }, [businessId, campaignId]);

  async function handleConfirm() {
    if (!preview) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await publishCampaign(businessId, campaignId, preview.version);
      if (res.ok) { onPublished(); return; }
      setPublishError({ message: res.error, reasons: res.reasons });
    } catch {
      setPublishError({ message: "No se pudo completar la publicación. Revisa el estado de la campaña." });
    } finally {
      setPublishing(false);
    }
  }

  const s = preview?.summary;
  const blocked = !preview || preview.blockers.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-confirm-title"
      style={{
        position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,23,42,.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 14, width: "min(560px, 100%)", maxHeight: "90vh",
        overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14,
      }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h2 id="publish-confirm-title" style={{ fontSize: 16, fontWeight: 600 }}>Crear campaña en Meta</h2>
          <button type="button" className="w-btn w-btn--ghost" onClick={onClose} disabled={publishing} aria-label="Cerrar">
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        {/* The single most important sentence on this screen. */}
        <div className="adsc-alert" data-tone="amber" style={{ fontWeight: 600 }}>
          <PauseCircle size={18} strokeWidth={2} style={{ flexShrink: 0 }} aria-hidden="true" />
          <span>La campaña se creará en Meta en estado PAUSADO y no comenzará a gastar.</span>
        </div>

        {!preview && !loadError && (
          <p style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
            <Loader2 size={16} className="cr-ready__spin" aria-hidden="true" />
            Comprobando la campaña con Meta…
          </p>
        )}

        {loadError && (
          <div className="adsc-alert" data-tone="error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{loadError}</span>
          </div>
        )}

        {s && (
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", fontSize: 13 }}>
            <dt>Campaña</dt><dd>{s.campaignName || "—"}</dd>
            <dt>Cuenta publicitaria</dt><dd>{s.adAccountName ?? "—"}{s.adAccountId ? ` (${s.adAccountId})` : ""}</dd>
            <dt>Moneda</dt><dd>{s.currency}</dd>
            <dt>Presupuesto diario</dt><dd>{s.dailyBudget}</dd>
            <dt>Inicio</dt><dd>{s.startsAt ?? "—"} <span style={{ color: "#6b7280" }}>({s.timezone})</span></dd>
            <dt>Segmentación</dt>
            <dd>{s.countries.join(", ") || "—"}{s.advantageAudience ? " · Audiencia Advantage+" : ""}</dd>
            <dt>Página</dt><dd>{s.pageName ?? "—"}</dd>
            <dt>Anunciante (DSA)</dt>
            <dd>{s.dsaRequired ? (s.dsaBeneficiary ?? "Falta") : "No se requiere para este país"}</dd>
            <dt>Pagador (DSA)</dt>
            <dd>{s.dsaRequired ? (s.dsaPayor ?? "Falta") : "No se requiere para este país"}</dd>
          </dl>
        )}

        {preview && preview.blockers.length > 0 && (
          <div className="adsc-alert" data-tone="error" role="alert" style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <strong>No se puede publicar todavía:</strong>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {preview.blockers.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
        )}

        {publishError && (
          <div className="adsc-alert" data-tone="error" role="alert" style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <strong>{publishError.message}</strong>
            {publishError.reasons && publishError.reasons.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {publishError.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            )}
          </div>
        )}

        <footer style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="w-btn w-btn--ghost" onClick={onClose} disabled={publishing}>
            Cancelar
          </button>
          <button
            type="button"
            className="w-btn w-btn--primary"
            onClick={handleConfirm}
            disabled={blocked || publishing}
          >
            {publishing ? "Creando en Meta…" : "Crear en pausa"}
          </button>
        </footer>
      </div>
    </div>
  );
}
