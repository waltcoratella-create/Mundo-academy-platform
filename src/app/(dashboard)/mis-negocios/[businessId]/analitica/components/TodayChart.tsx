"use client";

import { useRef, useEffect, useState } from "react";
import { EmptyStateBadge } from "./EmptyStateBadge";

interface TodayChartProps {
  data: number[];      // [] → empty state
  startLabel?: string; // "12:00 AM"
  endLabel?: string;   // "12:00 AM"
}

const CHART_HEIGHT = 160;

/**
 * Today bar chart.
 * 25 vertical grid lines (gray-4), a horizontal baseline at 80% (y=128),
 * axis labels at both ends (12px/500, gray-9), empty-state badge when no data.
 */
export function TodayChart({ data = [], startLabel = "12:00 AM", endLabel = "12:00 AM" }: TodayChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(737);
  const nums = data.map((v) => Number(v) || 0);
  const isEmpty = !nums.some((v) => v > 0);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const verticalLines = Array.from({ length: 25 }, (_, i) => Math.round((width / 24) * i));
  const baselineY = Math.round(CHART_HEIGHT * 0.8);
  const maxVal = Math.max(...nums, 1);
  const barWidth = nums.length ? (width / nums.length) * 0.6 : 0;

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: `${CHART_HEIGHT}px` }}>
      <svg width={width} height={CHART_HEIGHT} style={{ display: "block", overflow: "visible" }} aria-hidden="true">
        <g>
          {verticalLines.map((x, i) => (
            <line key={i} x1={x} y1={0} x2={x} y2={baselineY} stroke="var(--gray-4, #E8E8E8)" strokeWidth={1} />
          ))}
        </g>

        <line x1={0} y1={baselineY} x2={width} y2={baselineY} stroke="var(--gray-4, #E8E8E8)" strokeWidth={1} />

        {!isEmpty &&
          nums.map((val, i) => {
            const barH = val > 0 ? Math.max((val / maxVal) * baselineY, 2) : 0;
            const x = (width / nums.length) * i + (width / nums.length) * 0.2;
            const y = baselineY - barH;
            return <rect key={i} x={x} y={y} width={barWidth} height={barH} fill="var(--gray-a5, rgba(0,0,0,0.122))" rx={2} />;
          })}

        <g transform={`translate(0, ${baselineY + 4})`}>
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

      {isEmpty && <EmptyStateBadge />}
    </div>
  );
}
