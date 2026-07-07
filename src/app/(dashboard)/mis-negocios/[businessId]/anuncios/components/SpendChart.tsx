"use client";

import { useRef, useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Pill } from "./Pill";
import type { SpendPoint } from "../ads-data";

const CHART_H = 300;       // plot height (y = 0 → CHART_H)
const AXIS_W = 52;         // right gutter for the y-axis labels
const TICKS = [1, 0.7, 0.3, 0]; // fractions of max, matching Whop's spend chart

const METRIC_OPTIONS = [
  { value: "spend", label: "Spend" },
  { value: "impressions", label: "Impressions" },
  { value: "clicks", label: "Clicks" },
  { value: "results", label: "Results" },
];
const RANGE_OPTIONS = [
  { value: "7", label: "Últimos 7 días" },
  { value: "14", label: "Últimos 14 días" },
  { value: "30", label: "Últimos 30 días" },
];

const money = (v: number) => (v === 0 ? "0 US$" : `${v.toFixed(v < 1 ? 1 : 0)} US$`);

/**
 * Spend chart block: label + big total + metric/range/UTC selectors, then the
 * chart itself painted directly on the white page background (no card — like
 * Whop). Grid + right-aligned y-axis, area/line when there is spend, and a faint
 * "now" divider. Built on the same SVG grid tokens as the Analytics charts.
 */
export function SpendChart({
  total,
  dateLabel,
  series,
}: {
  total: string;
  dateLabel: string;
  series: SpendPoint[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const plotW = Math.max(width - AXIS_W, 10);
  const nums = series.map((p) => Number(p.value) || 0);
  const maxVal = Math.max(...nums, 1);
  const totalH = CHART_H + 24;

  const points = nums.map((v, i) => {
    const x = nums.length > 1 ? (plotW / (nums.length - 1)) * i : plotW;
    const y = CHART_H - (v / maxVal) * CHART_H;
    return { x, y };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = points.length
    ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${CHART_H} L0,${CHART_H} Z`
    : "";
  const hasSpend = nums.some((v) => v > 0);
  const nowX = points.length ? points[points.length - 1].x : plotW;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
      {/* label + selectors */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "8px" }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 400, lineHeight: "20px", color: "var(--gray-11, #636363)" }}>
            Spend · {dateLabel} · UTC
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 600,
              lineHeight: "40px",
              letterSpacing: "-0.6px",
              color: "var(--gray-12, #202020)",
              marginTop: "2px",
            }}
          >
            {total}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <Pill options={METRIC_OPTIONS} value="spend" minWidth={160} />
          <Pill options={RANGE_OPTIONS} value="14" minWidth={180} />
          <button type="button" className="ads-icon-btn" aria-label="Zona horaria UTC">
            <Clock size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* chart */}
      <div ref={wrapRef} style={{ position: "relative", width: "100%", minHeight: `${totalH}px` }}>
        <svg width={width} height={totalH} style={{ display: "block", overflow: "visible" }} aria-hidden="true">
          {/* horizontal grid + right y-axis labels */}
          {TICKS.map((f, i) => {
            const y = CHART_H - f * CHART_H;
            return (
              <g key={i}>
                <line x1={0} y1={y} x2={plotW} y2={y} stroke="var(--gray-a4, rgba(0,0,0,0.09))" strokeWidth={1} />
                <text
                  x={width}
                  y={y + 4}
                  textAnchor="end"
                  style={{ fontSize: "12px", fontWeight: 500, fontFamily: "var(--whop-font-inter, Inter), sans-serif", fill: "var(--gray-9, #8D8D8D)" }}
                >
                  {money(f * maxVal)}
                </text>
              </g>
            );
          })}

          {/* spend area/line */}
          {hasSpend && (
            <g>
              <path d={areaPath} fill="var(--gray-a3, rgba(0,0,0,0.06))" />
              <path d={linePath} fill="none" stroke="var(--gray-12, #202020)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          )}

          {/* "now" divider */}
          <line x1={nowX} y1={0} x2={nowX} y2={CHART_H} stroke="var(--gray-a5, rgba(0,0,0,0.122))" strokeWidth={1} />
        </svg>
      </div>
    </div>
  );
}
