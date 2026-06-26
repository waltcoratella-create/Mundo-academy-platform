"use client";

import { useState, useTransition } from "react";
import type { FilterState, StatCardData, BreakdownItem } from "../types";
import {
  WIDGET_LABEL, DEFAULT_CONFIG, type WidgetConfig, type WidgetKey,
} from "../widgets-config";
import { saveAnalyticsWidgets, resetAnalyticsWidgets } from "../widgets-actions";
import { FilterBar } from "./FilterBar";
import { StatCard } from "./StatCard";
import { BreakdownCard } from "./BreakdownCard";
import { ShareModal } from "./ShareModal";

interface StatsManagerProps {
  businessId: string;
  filter: FilterState;
  selected: { range: string; comparison: string; granularity: string; productId: string };
  products: { id: string; name: string }[];
  stats: StatCardData[];
  breakdown: BreakdownItem[];
  widgetsInitial: WidgetConfig[];
}

export function StatsManager({ businessId, filter, selected, products, stats, breakdown, widgetsInitial }: StatsManagerProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(widgetsInitial);
  const [editMode, setEditMode] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [shareWidget, setShareWidget] = useState<StatCardData | null>(null);
  const [isPending, startTransition] = useTransition();

  const statsById = new Map(stats.map((s) => [s.id, s]));
  const visible = widgets.filter((w) => w.visible);
  const hidden = widgets.filter((w) => !w.visible);

  function move(key: WidgetKey, dir: "up" | "down") {
    setWidgets((prev) => {
      const arr = [...prev];
      const i = arr.findIndex((w) => w.key === key);
      if (i < 0) return prev;
      let j = dir === "up" ? i - 1 : i + 1;
      while (j >= 0 && j < arr.length && !arr[j].visible) j += dir === "up" ? -1 : 1;
      if (j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }
  function hide(key: WidgetKey) {
    setWidgets((prev) => prev.map((w) => (w.key === key ? { ...w, visible: false } : w)));
  }
  function add(key: WidgetKey) {
    setWidgets((prev) => {
      const w = prev.find((x) => x.key === key);
      if (!w) return prev;
      return [...prev.filter((x) => x.key !== key), { ...w, visible: true }];
    });
    setAddOpen(false);
  }

  function toggleEdit() {
    if (!editMode) { setEditMode(true); return; }
    // Saving
    startTransition(async () => {
      await saveAnalyticsWidgets({ businessId, widgets });
      setEditMode(false);
      setAddOpen(false);
    });
  }
  function reset() {
    startTransition(async () => {
      await resetAnalyticsWidgets({ businessId });
      setWidgets(DEFAULT_CONFIG);
      setEditMode(false);
      setAddOpen(false);
    });
  }

  return (
    <>
      <FilterBar
        filter={filter}
        selected={selected}
        products={products}
        editMode={editMode}
        editPending={isPending}
        onAdd={() => setAddOpen((o) => !o)}
        onToggleEdit={toggleEdit}
      />

      {editMode && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--gray-a11, rgba(0,0,0,0.608))" }}>
            Modo edición — reordena, oculta o añade widgets.
          </span>
          <button type="button" className="btn-surface" onClick={reset} disabled={isPending}>
            Restablecer
          </button>
        </div>
      )}

      {editMode && addOpen && (
        <div
          style={{
            alignSelf: "flex-start", minWidth: "240px", background: "#fff",
            border: "1px solid var(--gray-a5, rgba(0,0,0,0.122))", borderRadius: "8px",
            boxShadow: "var(--shadow-card)", padding: "4px", display: "flex", flexDirection: "column", gap: "2px",
          }}
        >
          {hidden.length === 0 ? (
            <span style={{ padding: "8px", fontSize: "13px", color: "var(--gray-9, #8D8D8D)" }}>
              Todos los widgets ya están visibles
            </span>
          ) : (
            hidden.map((w) => (
              <button key={w.key} type="button" className="menu-item" onClick={() => add(w.key)}>
                + {WIDGET_LABEL[w.key]}
              </button>
            ))
          )}
        </div>
      )}

      <div className="analytics-container">
        <div className="stats-grid">
          {visible.map((w, i) => (
            <div key={w.key} style={{ position: "relative" }}>
              {editMode && (
                <div style={{ position: "absolute", top: "8px", right: "8px", zIndex: 5, display: "flex", gap: "4px" }}>
                  <button type="button" className="whop-icon-badge" aria-label="Subir" disabled={i === 0} onClick={() => move(w.key, "up")}>↑</button>
                  <button type="button" className="whop-icon-badge" aria-label="Bajar" disabled={i === visible.length - 1} onClick={() => move(w.key, "down")}>↓</button>
                  <button type="button" className="whop-icon-badge" aria-label="Ocultar" onClick={() => hide(w.key)}>✕</button>
                </div>
              )}
              {w.key === "payment-breakdown" ? (
                <BreakdownCard items={breakdown} />
              ) : statsById.has(w.key) ? (
                <StatCard data={statsById.get(w.key)!} onShare={(id) => setShareWidget(statsById.get(id) ?? null)} />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {shareWidget && <ShareModal data={shareWidget} onClose={() => setShareWidget(null)} />}
    </>
  );
}
