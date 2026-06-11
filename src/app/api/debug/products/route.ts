/**
 * TEMPORARY DEBUG ENDPOINT — remove after investigation.
 * GET /api/debug/products
 *
 * Returns a full diagnostic dump of the products table so we can see
 * exactly what values are in the DB and why getPublicProducts returns [].
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Must be dynamic — uses runtime env vars (Supabase).
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();

  // ── 0. Check env vars ─────────────────────────────────────────────────────
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL:    process.env.NEXT_PUBLIC_SUPABASE_URL   ? "SET" : "MISSING",
    SUPABASE_SERVICE_ROLE_KEY:   process.env.SUPABASE_SERVICE_ROLE_KEY  ? "SET" : "MISSING",
  };

  // ── 1. All products — no filters ─────────────────────────────────────────
  const { data: allRows, error: allErr } = await supabase
    .from("products")
    .select("id, name, status, is_public, access_type, business_id, cover_url, created_at")
    .order("created_at", { ascending: false });

  // ── 2. status = published only ────────────────────────────────────────────
  const { data: publishedRows, error: publishedErr } = await supabase
    .from("products")
    .select("id, name, status, is_public, access_type, business_id")
    .eq("status", "published");

  // ── 3. Exact current getPublicProducts query (with cover_url) ────────────
  const { data: withCoverRows, error: withCoverErr } = await supabase
    .from("products")
    .select("id, name, status, is_public, access_type, business_id, cover_url, businesses(id, name)")
    .eq("status", "published")
    .or("access_type.neq.manual,access_type.is.null")
    .order("created_at", { ascending: false });

  // ── 4. Without cover_url fallback ────────────────────────────────────────
  const { data: baseFallbackRows, error: baseFallbackErr } = await supabase
    .from("products")
    .select("id, name, status, is_public, access_type, business_id, businesses(id, name)")
    .eq("status", "published")
    .or("access_type.neq.manual,access_type.is.null")
    .order("created_at", { ascending: false });

  // ── 5. Old broken query (for comparison) ─────────────────────────────────
  const { data: oldQueryRows, error: oldQueryErr } = await supabase
    .from("products")
    .select("id, name, status, is_public, access_type, business_id")
    .eq("status", "published")
    .eq("is_public", true)
    .neq("access_type", "manual");

  // ── 6. Check cover_url column existence ───────────────────────────────────
  const { data: coverColCheck, error: coverColErr } = await supabase
    .from("products")
    .select("cover_url")
    .limit(1);

  return NextResponse.json({
    env: envCheck,
    summary: {
      total_products:             allRows?.length     ?? null,
      published_products:         publishedRows?.length ?? null,
      new_query_with_cover:       withCoverRows?.length ?? null,
      new_query_base_fallback:    baseFallbackRows?.length ?? null,
      old_broken_query:           oldQueryRows?.length ?? null,
      cover_url_column_exists:    coverColErr?.code !== "42703",
    },
    errors: {
      allErr:           allErr ?? null,
      publishedErr:     publishedErr ?? null,
      withCoverErr:     withCoverErr ?? null,
      baseFallbackErr:  baseFallbackErr ?? null,
      oldQueryErr:      oldQueryErr ?? null,
      coverColErr:      coverColErr ?? null,
    },
    all_products_raw: allRows ?? [],
    published_raw:    publishedRows ?? [],
    new_query_results: withCoverRows ?? baseFallbackRows ?? [],
    old_query_results: oldQueryRows ?? [],
  });
}
