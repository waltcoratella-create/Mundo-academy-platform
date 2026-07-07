"use client";

import Link from "next/link";
import { Plus, Settings, HelpCircle } from "lucide-react";

/**
 * Page header — "Ads" title (18/600/26) on the left, secondary icon buttons and
 * the brand-blue "Nueva campaña" CTA on the right. The CTA links to the campaign
 * builder route.
 */
export function AdsHeader({ createHref }: { createHref: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
      <h1
        style={{
          fontFamily: "var(--whop-font-inter), sans-serif",
          fontSize: "18px",
          fontWeight: 600,
          lineHeight: "26px",
          color: "var(--gray-12, #202020)",
          margin: 0,
        }}
      >
        Ads
      </h1>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Link href={createHref} className="ads-btn-primary">
          <Plus size={16} strokeWidth={2.5} />
          Nueva campaña
        </Link>
        <button type="button" className="ads-icon-btn" aria-label="Configuración de anuncios">
          <Settings size={16} strokeWidth={2} />
        </button>
        <button type="button" className="ads-icon-btn" aria-label="Ayuda">
          <HelpCircle size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
