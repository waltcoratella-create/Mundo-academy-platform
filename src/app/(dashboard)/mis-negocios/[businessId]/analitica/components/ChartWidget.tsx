"use client";

import { useRef, useEffect, useState } from "react";

interface ChartWidgetProps {
  data: number[];
  startLabel: string; // "jun 14"
  endLabel: string;   // "Hoy"
  width?: number;
}

const CHART_H = 123; // chart area height (y = 0 → 123)

/**
 * Mini SVG chart for each stat card.
 * Horizontal grid: 5 lines at y = 0, 30.75, 61.5, 92.25, 123 (stroke gray-a4).
 * Labels: startLabel (anchor start) + endLabel (anchor end), 12px/500, gray-9.
 */
export function ChartWidget({ data = [], startLabel, endLabel, width: propWidth }: ChartWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(propWidth ?? 326.5);
  const isEmpty = data.length === 0;

  useEffect(() => {
    if (propWidth) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [propWidth]);

  const totalHeight = CHART_H + 38; // 123 + 38px for labels
  const gridYValues = Array.from({ length: 5 }, (_, i) => Math.round(((CHART_H / 4) * i) * 100) / 100);
  const maxVal = data.length ? Math.max(...data, 1) : 1;

  return (
    <div ref={containerRef} className="relative w-full flex-1" style={{ minHeight: `${totalHeight}px` }}>
      <svg width={width} height={totalHeight} style={{ display: "block", overflow: "visible" }} aria-hidden="true">
        <g>
          {gridYValues.map((y, i) => (
            <line key={i} x1={0} y1={y} x2={width} y2={y} stroke="var(--gray-a4, rgba(0,0,0,0.09))" strokeWidth={1} />
          ))}
        </g>

        {!isEmpty && (
          <g transform="translate(0, 10)">
            {data.map((val, i) => {
              const barW = (width / data.length) * 0.7;
              const x = (width / data.length) * i + (width / data.length) * 0.15;
              const barH = (val / maxVal) * CHART_H;
              const y = CHART_H - barH;
              return <rect key={i} x={x} y={y} width={barW} height={barH} fill="var(--gray-a5, rgba(0,0,0,0.122))" rx={1} />;
            })}
          </g>
        )}

        <g transform={`translate(0, ${CHART_H + 10})`}>
          <g transform="translate(0, 17)" className="pointer-events-none">
            <text
              textAnchor="start"
              style={{ fontSize: "12px", fontWeight: 500, fontFamily: "var(--whop-font-inter, Inter), sans-serif", fill: "var(--gray-9, #8D8D8D)" }}
            >
              {startLabel}
            </text>
          </g>
          <g transform={`translate(${width}, 17)`} className="pointer-events-none">
            <text
              textAnchor="end"
              style={{ fontSize: "12px", fontWeight: 500, fontFamily: "var(--whop-font-inter, Inter), sans-serif", fill: "var(--gray-9, #8D8D8D)" }}
            >
              {endLabel}
            </text>
          </g>
        </g>
      </svg>

      {isEmpty && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "20px",
            padding: "0 8px",
            borderRadius: "6px",
            background: "var(--gray-3, #EFEFEF)",
            color: "rgba(0,0,0,0.608)",
            fontSize: "12px",
            fontWeight: 500,
            lineHeight: "16px",
            whiteSpace: "nowrap",
            position: "absolute",
            top: `${(CHART_H + 10) / 2}px`,
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        >
          No hay datos disponibles
        </span>
      )}
    </div>
  );
}
