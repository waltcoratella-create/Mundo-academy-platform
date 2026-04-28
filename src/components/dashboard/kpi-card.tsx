"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { KpiCard } from "@/types";

interface KpiCardProps extends KpiCard {
  format?: "currency" | "number" | "percent" | "raw";
}

export function KpiCard({ label, value, change, changeLabel, format = "raw" }: KpiCardProps) {
  const isPositive = change >= 0;

  return (
    <div className="kpi-card">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <div
        className={cn(
          "mt-2 flex items-center gap-1 text-xs font-medium",
          isPositive ? "text-green-600" : "text-red-500"
        )}
      >
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>
          {isPositive ? "+" : ""}
          {change}% {changeLabel ?? "vs mes anterior"}
        </span>
      </div>
    </div>
  );
}
