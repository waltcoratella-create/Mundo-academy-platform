"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import type { FilterState } from "../types";
import { RANGE_OPTIONS, COMPARISON_OPTIONS, granularityOptionsForRange, type Option } from "../filters";

interface FilterBarProps {
  filter: FilterState;
  selected: { range: string; comparison: string; granularity: string; productId: string };
  products: { id: string; name: string }[];
  editMode: boolean;
  editPending: boolean;
  onAdd: () => void;
  onToggleEdit: () => void;
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M6 9l6 6 6-6" stroke="var(--gray-11, #636363)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="var(--gray-11, #636363)" strokeWidth="2" />
      <path d="M3 9h18M8 2v4M16 2v4" stroke="var(--gray-11, #636363)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M12 5v14M5 12h14" stroke="var(--gray-12, #202020)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="3" stroke="var(--gray-12, #202020)" strokeWidth="2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 7 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3 15.4 1.65 1.65 0 0 0 1.83 14H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9 1.65 1.65 0 0 0 4.27 7.18l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09c.36.14.66.4.86.74" stroke="var(--gray-12, #202020)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "14px", fontWeight: 400, lineHeight: "20px",
  color: "var(--gray-a11, rgba(0,0,0,0.608))", whiteSpace: "nowrap",
};

function Dropdown({ display, options, value, onSelect }: {
  display: string;
  options: Option[];
  value: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="btn-surface" onClick={() => setOpen((o) => !o)}>
        {display}
        <Chevron />
      </button>
      {open && (
        <div className="menu">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className="menu-item"
              data-active={o.value === value}
              onClick={() => { onSelect(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Stats filter bar — surface buttons drive URL searchParams; the server
 * component re-fetches on change. Add / Editar remain visual for now.
 */
export function FilterBar({ filter, selected, products, editMode, editPending, onAdd, onToggleEdit }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const productOptions: Option[] = [
    { value: "all", label: "Todos los productos" },
    ...products.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="hide-scrollbar" style={{ display: "flex", alignItems: "center", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}>
      <Dropdown display={filter.timeRange} options={RANGE_OPTIONS} value={selected.range} onSelect={(v) => setParam("range", v)} />

      <button type="button" className="btn-surface"><CalendarIcon />{filter.dateLabel}</button>

      <span style={labelStyle}>compared to</span>
      <Dropdown display={filter.comparisonPeriod} options={COMPARISON_OPTIONS} value={selected.comparison} onSelect={(v) => setParam("comparison", v)} />

      <Dropdown display={filter.granularity} options={granularityOptionsForRange(selected.range)} value={selected.granularity} onSelect={(v) => setParam("granularity", v)} />

      <span style={labelStyle}>on</span>
      <Dropdown display={filter.product} options={productOptions} value={selected.productId} onSelect={(v) => setParam("productId", v)} />

      <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexShrink: 0 }}>
        {editMode && (
          <button type="button" className="btn-surface" onClick={onAdd}><PlusIcon />Add</button>
        )}
        <button type="button" className="btn-surface" onClick={onToggleEdit} disabled={editPending}>
          <GearIcon />{editMode ? (editPending ? "Guardando…" : "Guardar") : "Editar"}
        </button>
      </div>
    </div>
  );
}
