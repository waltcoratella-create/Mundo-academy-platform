"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import type { AdCampaign, AdDelivery, AdPlatform } from "../ads-data";

const DELIVERY_LABEL: Record<AdDelivery, string> = {
  draft: "Borrador",
  active: "Activa",
  paused: "Pausada",
  in_review: "En revisión",
  archived: "Archivada",
};

function PlatformIcon({ platform }: { platform: AdPlatform }) {
  if (platform === "meta") {
    // Meta infinity glyph
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path
          d="M4.2 15.4c-.9 0-1.7-.9-1.7-2.9 0-2.6 1.3-4.9 3-4.9 1.3 0 2.3 1.3 3.4 3.4C7.6 13.6 6.3 15.4 4.2 15.4Zm15.6 0c-1.6 0-2.9-1.9-4.6-5 .9-1.7 1.9-2.8 3-2.8 1.7 0 3 2.3 3 4.9 0 2-.7 2.9-1.4 2.9ZM12 10.6c-1.4-2.6-2.9-4.5-5.2-4.5C4 6.1 2 8.9 2 12.5c0 2.9 1.4 4.9 3.6 4.9 1.7 0 2.9-1 4.7-4 .6 1 1.2 2 1.7 2.8"
          stroke="var(--gray-11, #636363)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return <span style={{ width: 18, height: 18, borderRadius: 4, background: "var(--gray-5)", flexShrink: 0 }} />;
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="ads-switch" data-on={on} onClick={onToggle} role="switch" aria-checked={on} aria-label="Encendido/Apagado">
      <span className="ads-switch__knob" />
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ padding: "56px 16px", textAlign: "center", color: "var(--gray-9, #8D8D8D)", fontSize: "14px", lineHeight: "20px" }}>
      {label}
    </div>
  );
}

/**
 * Campaign table — plain HTML table styled with the shared table tokens. Draft
 * rows get the amber background (hover → amber-3). The on/off switch is local
 * optimistic state (no backend wired yet).
 */
export function CampaignTable({ campaigns, query, emptyLabel, campaignHrefBase }: { campaigns: AdCampaign[]; query: string; emptyLabel: string; campaignHrefBase?: string }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    () => Object.fromEntries(campaigns.map((c) => [c.id, c.enabled])),
  );

  const q = query.trim().toLowerCase();
  const rows = q ? campaigns.filter((c) => c.title.toLowerCase().includes(q)) : campaigns;

  if (rows.length === 0) {
    return <EmptyState label={q ? "No se encontraron resultados." : emptyLabel} />;
  }

  return (
    <div className="ads-table-wrap">
      <table className="ads-table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Entrega</th>
            <th>Budget</th>
            <th>Spend</th>
            <th>Results</th>
            <th>Cost per result</th>
            <th style={{ textAlign: "right" }}>Encendido/Apagado</th>
            <th style={{ textAlign: "right" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} data-draft={c.delivery === "draft"}>
              <td>
                <span className="ads-cell-title">
                  <PlatformIcon platform={c.platform} />
                  {c.title}
                </span>
              </td>
              <td>
                <span className="ads-delivery">
                  <span className="ads-delivery__dot" />
                  {DELIVERY_LABEL[c.delivery]}
                </span>
              </td>
              <td>{c.budget}</td>
              <td>{c.spend}</td>
              <td style={{ color: "var(--gray-9, #8D8D8D)" }}>{c.results}</td>
              <td>{c.costPerResult ?? "—"}</td>
              <td style={{ textAlign: "right" }}>
                <Switch
                  on={!!enabled[c.id]}
                  onToggle={() => setEnabled((s) => ({ ...s, [c.id]: !s[c.id] }))}
                />
              </td>
              <td style={{ textAlign: "right" }}>
                {/* Only drafts are editable — nothing is synced to an ad
                    platform yet, so a live campaign has no safe edit path. */}
                {c.delivery === "draft" && campaignHrefBase ? (
                  <Link href={`${campaignHrefBase}/${c.id}/edit`} className="ads-rowaction">
                    <Pencil size={14} strokeWidth={2} aria-hidden="true" />
                    Editar
                  </Link>
                ) : (
                  <span className="ads-rowaction" data-disabled="true" title="Solo se pueden editar borradores">
                    <Pencil size={14} strokeWidth={2} aria-hidden="true" />
                    Editar
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
