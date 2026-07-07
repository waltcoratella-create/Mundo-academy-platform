"use client";

import { Search, SlidersHorizontal } from "lucide-react";

export type AdsTabKey = "campaigns" | "adsets" | "ads";

const TABS: { key: AdsTabKey; label: string }[] = [
  { key: "campaigns", label: "Campañas de anuncios" },
  { key: "adsets", label: "Grupos de anuncios" },
  { key: "ads", label: "Anuncios" },
];

/**
 * Tab strip + right-aligned search / filters. Tabs only swap the content below
 * (no navigation) — the active key is owned by AdsClient.
 */
export function AdsTabs({
  active,
  onSelect,
  query,
  onQuery,
}: {
  active: AdsTabKey;
  onSelect: (key: AdsTabKey) => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
      <div className="ads-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className="ads-tab"
            data-active={t.key === active}
            onClick={() => onSelect(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <label className="ads-search">
          <Search size={16} strokeWidth={2} />
          <input
            type="text"
            placeholder="Buscar..."
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </label>
        <button type="button" className="ads-icon-btn" aria-label="Filtros">
          <SlidersHorizontal size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
