"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TodayData, StatCardData, BreakdownItem, FilterState } from "../types";
import type { SliceParams } from "../data";
import type { SharePreferences } from "../share-config";
import type { WidgetConfig } from "../widgets-config";
import { getTransactionMetrics } from "../realtime-actions";
import { TodaySection } from "./TodaySection";
import { StatsManager } from "./StatsManager";

export type ConnStatus = "connecting" | "connected" | "degraded" | "offline";

interface Props {
  businessId: string;
  businessName: string;
  sharePrefs: SharePreferences;
  params: SliceParams;
  filter: FilterState;
  selected: { range: string; comparison: string; granularity: string; productId: string };
  products: { id: string; name: string }[];
  widgetsInitial: WidgetConfig[];
  initial: { today: TodayData; stats: StatCardData[]; breakdown: BreakdownItem[] };
}

/**
 * Single client provider for live Analytics. Hydrated from server-rendered
 * initial data; owns {today, stats, breakdown} state. Opens ONE Supabase
 * Realtime channel filtered by business_id (transactions + members). Slice
 * re-fetching on events is added in the following commits.
 */
export function AnalyticsLive({
  businessId, businessName, sharePrefs, params, filter, selected, products, widgetsInitial, initial,
}: Props) {
  const [today, setToday] = useState<TodayData>(initial.today);
  const [stats, setStats] = useState<StatCardData[]>(initial.stats);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>(initial.breakdown);
  const [status, setStatus] = useState<ConnStatus>("connecting");

  // Always read the latest filters/params inside realtime callbacks.
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; });

  const txTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetchTransactions = useCallback(async () => {
    const slice = await getTransactionMetrics(paramsRef.current);
    if (!slice) return;
    setToday(slice.today);
    setBreakdown(slice.breakdown);
    const map = new Map(slice.stats.map((s) => [s.id, s]));
    setStats((prev) => prev.map((s) => map.get(s.id) ?? s));
  }, []);

  // Debounce bursts of events into a single slice re-fetch.
  const scheduleTx = useCallback(() => {
    if (txTimer.current) clearTimeout(txTimer.current);
    txTimer.current = setTimeout(refetchTransactions, 500);
  }, [refetchTransactions]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`analytics_${businessId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `business_id=eq.${businessId}` }, () => { scheduleTx(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `business_id=eq.${businessId}` }, () => { /* members handled in the next commit */ })
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("connected");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("degraded");
      });

    return () => {
      if (txTimer.current) clearTimeout(txTimer.current);
      supabase.removeChannel(channel);
    };
  }, [businessId, scheduleTx]);

  void status; // status UI added in a later commit

  return (
    <>
      <TodaySection today={today} />

      {today.verifyIdentityWarning && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", borderRadius: "12px", background: "var(--gray-2, #F9F9F9)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M12 3 2 20h20L12 3z" stroke="#B7791F" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 10v4M12 17h.01" stroke="#B7791F" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: "14px", fontWeight: 400, lineHeight: "20px", color: "var(--gray-12, #202020)" }}>
            <span style={{ color: "#B7791F", fontWeight: 500 }}>Verifica tu identidad</span> para seguir recibiendo pagos y para retirar.
          </span>
        </div>
      )}

      <section>
        <h2 style={{ fontSize: "28px", fontWeight: 700, lineHeight: "36px", letterSpacing: "-0.025em", color: "var(--gray-12, #202020)" }}>
          Stats
        </h2>
        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <StatsManager
            businessId={businessId}
            businessName={businessName}
            sharePrefs={sharePrefs}
            filter={filter}
            selected={selected}
            products={products}
            stats={stats}
            breakdown={breakdown}
            widgetsInitial={widgetsInitial}
          />
        </div>
      </section>
    </>
  );
}
