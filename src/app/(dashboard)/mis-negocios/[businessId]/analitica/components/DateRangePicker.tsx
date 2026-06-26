"use client";

import { useState } from "react";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sameDay(a: Date | null, b: Date | null): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface Props {
  initialFrom?: string;
  initialTo?: string;
  onApply: (from: string, to: string) => void;
  onCancel: () => void;
}

/** Month/year-navigable date-range picker. Pure SVG/HTML, no dependencies. */
export function DateRangePicker({ initialFrom, initialTo, onApply, onCancel }: Props) {
  const today = new Date();
  const [from, setFrom] = useState<Date | null>(initialFrom ? new Date(`${initialFrom}T00:00:00`) : null);
  const [to, setTo] = useState<Date | null>(initialTo ? new Date(`${initialTo}T00:00:00`) : null);
  const [view, setView] = useState({ y: (from ?? today).getFullYear(), m: (from ?? today).getMonth() });

  function pick(d: Date) {
    if (!from || (from && to)) { setFrom(d); setTo(null); }
    else if (d >= from) setTo(d);
    else { setFrom(d); setTo(null); }
  }
  function shiftMonth(delta: number) {
    setView((v) => {
      const total = v.y * 12 + v.m + delta;
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
    });
  }
  function shiftYear(delta: number) {
    setView((v) => ({ ...v, y: v.y + delta }));
  }

  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.y, view.m, d));

  const inRange = (d: Date) => !!from && !!to && d >= from && d <= to;

  return (
    <div className="menu" style={{ width: "280px", padding: "12px", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          <button type="button" className="whop-icon-badge" onClick={() => shiftYear(-1)} aria-label="Año anterior">«</button>
          <button type="button" className="whop-icon-badge" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">‹</button>
        </div>
        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--gray-12, #202020)", textTransform: "capitalize" }}>
          {MONTHS[view.m]} {view.y}
        </span>
        <div style={{ display: "flex", gap: "4px" }}>
          <button type="button" className="whop-icon-badge" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">›</button>
          <button type="button" className="whop-icon-badge" onClick={() => shiftYear(1)} aria-label="Año siguiente">»</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {WEEKDAYS.map((w) => (
          <span key={w} style={{ textAlign: "center", fontSize: "11px", fontWeight: 500, color: "var(--gray-9, #8D8D8D)", height: "24px", lineHeight: "24px" }}>{w}</span>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <span key={`e${i}`} />
          ) : (
            <button
              key={iso(d)}
              type="button"
              onClick={() => pick(d)}
              style={{
                height: "30px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                background: sameDay(d, from) || sameDay(d, to) ? "#202020" : inRange(d) ? "var(--gray-a3, rgba(0,0,0,0.063))" : "transparent",
                color: sameDay(d, from) || sameDay(d, to) ? "#fff" : "var(--gray-12, #202020)",
              }}
            >
              {d.getDate()}
            </button>
          ),
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
        <button type="button" className="btn-surface" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn-surface" disabled={!from || !to} onClick={() => from && to && onApply(iso(from), iso(to))}>
          Establecer
        </button>
      </div>
    </div>
  );
}
