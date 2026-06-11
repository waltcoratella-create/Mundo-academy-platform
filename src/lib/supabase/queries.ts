import { createAdminClient } from "./admin";
import { normalizeAccessType, normalizeBillingPeriod } from "@/lib/constants/products";

export interface Business {
  id: string;
  name: string;
}

/** Richer business info used for list/overview pages. */
export interface BusinessWithMeta {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
}

export interface OwnedAndJoinedBusinesses {
  ownedBusinesses: BusinessWithMeta[];
  joinedBusinesses: BusinessWithMeta[];
}

export interface DashboardKPIs {
  revenue: number;
  revenueChange: number;
  memberCount: number;
  productCount: number;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  product_name: string | null;
  user_email: string | null;
}

async function resolveSupabaseUserId(clerkUserId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getUserBusiness(clerkUserId: string): Promise<Business | null> {
  try {
    const supabase = createAdminClient();
    const supabaseUserId = await resolveSupabaseUserId(clerkUserId);
    if (!supabaseUserId) return null;

    const { data, error } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("owner_id", supabaseUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as Business;
  } catch {
    return null;
  }
}

export async function getUserBusinesses(clerkUserId: string): Promise<Business[]> {
  try {
    const supabase = createAdminClient();
    const supabaseUserId = await resolveSupabaseUserId(clerkUserId);
    if (!supabaseUserId) return [];

    const { data, error } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("owner_id", supabaseUserId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as Business[];
  } catch {
    return [];
  }
}

/**
 * Returns businesses the user owns AND businesses they have joined as a member.
 * Owned businesses are NEVER duplicated in joinedBusinesses — de-duplication is
 * enforced both client-side (Set of owned IDs) and server-side (neq owner_id).
 */
export async function getUserOwnedAndJoinedBusinesses(
  clerkUserId: string
): Promise<OwnedAndJoinedBusinesses> {
  const empty: OwnedAndJoinedBusinesses = { ownedBusinesses: [], joinedBusinesses: [] };
  try {
    const supabase = createAdminClient();
    const supabaseUserId = await resolveSupabaseUserId(clerkUserId);
    if (!supabaseUserId) return empty;

    // ── 1. Owned businesses ──────────────────────────────────────────────────
    const { data: ownedData } = await supabase
      .from("businesses")
      .select("id, name, description, logo_url")
      .eq("owner_id", supabaseUserId)
      .order("created_at", { ascending: false });

    const ownedBusinesses: BusinessWithMeta[] = (ownedData ?? []).map((b) => {
      const r = b as Record<string, unknown>;
      return {
        id:          r.id as string,
        name:        r.name as string,
        description: (r.description ?? null) as string | null,
        logo_url:    (r.logo_url ?? null) as string | null,
      };
    });

    const ownedIds = new Set(ownedBusinesses.map((b) => b.id));

    // ── 2. Member rows ───────────────────────────────────────────────────────
    const { data: memberRows } = await supabase
      .from("members")
      .select("business_id")
      .eq("user_id", supabaseUserId)
      .eq("status", "active");

    // Filter out any businesses already owned by this user
    const joinedIds = [...new Set(
      (memberRows ?? [])
        .map((m) => (m as Record<string, unknown>).business_id as string)
        .filter((id) => !ownedIds.has(id))
    )];

    // ── 3. Business details for joined IDs ───────────────────────────────────
    let joinedBusinesses: BusinessWithMeta[] = [];
    if (joinedIds.length > 0) {
      const { data: joinedData } = await supabase
        .from("businesses")
        .select("id, name, description, logo_url")
        .in("id", joinedIds)
        .order("name", { ascending: true });

      joinedBusinesses = (joinedData ?? []).map((b) => {
        const r = b as Record<string, unknown>;
        return {
          id:          r.id as string,
          name:        r.name as string,
          description: (r.description ?? null) as string | null,
          logo_url:    (r.logo_url ?? null) as string | null,
        };
      });
    }

    return { ownedBusinesses, joinedBusinesses };
  } catch {
    return empty;
  }
}

export async function getBusinessById(
  businessId: string,
  clerkUserId: string
): Promise<Business | null> {
  try {
    const supabase = createAdminClient();
    const supabaseUserId = await resolveSupabaseUserId(clerkUserId);
    if (!supabaseUserId) return null;

    const { data, error } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("id", businessId)
      .eq("owner_id", supabaseUserId)
      .maybeSingle();

    if (error || !data) return null;
    return data as Business;
  } catch {
    return null;
  }
}

export interface BusinessSettings {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  support_email: string | null;
  logo_url: string | null;
  cover_url: string | null;
  hasExtendedFields: boolean;
}

export async function getBusinessSettings(businessId: string): Promise<BusinessSettings | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("businesses")
      .select("id, name, description, website, support_email, logo_url, cover_url")
      .eq("id", businessId)
      .maybeSingle();

    if (!error && data) {
      const row = data as Record<string, unknown>;
      return {
        id:            row.id as string,
        name:          row.name as string,
        description:   (row.description as string | null) ?? null,
        website:       (row.website as string | null) ?? null,
        support_email: (row.support_email as string | null) ?? null,
        logo_url:      (row.logo_url as string | null) ?? null,
        cover_url:     (row.cover_url as string | null) ?? null,
        hasExtendedFields: true,
      };
    }

    // Extended columns may not exist yet — fall back to minimal
    const { data: minimal } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("id", businessId)
      .maybeSingle();

    if (!minimal) return null;
    const min = minimal as Record<string, unknown>;
    return {
      id: min.id as string,
      name: min.name as string,
      description: null,
      website: null,
      support_email: null,
      logo_url: null,
      cover_url: null,
      hasExtendedFields: false,
    };
  } catch {
    return null;
  }
}

export async function getDashboardKPIs(businessId: string): Promise<DashboardKPIs> {
  try {
    const supabase = createAdminClient();
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

    const [current, previous, members, products] = await Promise.all([
      supabase
        .from("transactions")
        .select("amount")
        .eq("business_id", businessId)
        .eq("status", "succeeded")
        .gte("created_at", thirtyDaysAgo),
      supabase
        .from("transactions")
        .select("amount")
        .eq("business_id", businessId)
        .eq("status", "succeeded")
        .gte("created_at", sixtyDaysAgo)
        .lt("created_at", thirtyDaysAgo),
      supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "active"),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "published"),
    ]);

    const revenue = (current.data ?? []).reduce(
      (sum: number, tx: { amount: number }) => sum + Number(tx.amount),
      0
    );
    const prevRevenue = (previous.data ?? []).reduce(
      (sum: number, tx: { amount: number }) => sum + Number(tx.amount),
      0
    );
    const revenueChange =
      prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10 : 0;

    return {
      revenue,
      revenueChange,
      memberCount: members.count ?? 0,
      productCount: products.count ?? 0,
    };
  } catch {
    return { revenue: 0, revenueChange: 0, memberCount: 0, productCount: 0 };
  }
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  status: string;
  access_type: string;
  is_public: boolean;
  currency: string;
  billing_period: string;
  created_at: string;
  cover_url: string | null; // requires: ALTER TABLE products ADD COLUMN IF NOT EXISTS cover_url text;
}

function withProductDefaults(row: Record<string, unknown>): Product {
  return {
    id:             row.id as string,
    name:           row.name as string,
    description:    (row.description as string | null) ?? null,
    price:          Number(row.price ?? 0),
    type:           (row.type as string) ?? "curso",
    status:         (row.status as string) ?? "draft",
    access_type:    normalizeAccessType(row.access_type as string | undefined),
    is_public:      Boolean(row.is_public ?? false),
    currency:       (row.currency as string) ?? "USD",
    billing_period: normalizeBillingPeriod(row.billing_period as string | undefined),
    created_at:     row.created_at as string,
    cover_url:      (row.cover_url as string | null) ?? null,
  };
}

// ── Select strings ────────────────────────────────────────────────────────────
// cover_url is included; if the column doesn't exist yet (42703) we fall back
// to the base select so the app never breaks before the migration is run.

const PRODUCT_SELECT_WITH_COVER =
  "id, name, description, price, type, status, access_type, is_public, currency, billing_period, created_at, cover_url";
const PRODUCT_SELECT_BASE =
  "id, name, description, price, type, status, access_type, is_public, currency, billing_period, created_at";

export async function getProductById(
  productId: string,
  businessId: string
): Promise<Product | null> {
  try {
    const supabase = createAdminClient();

    const primary = await supabase
      .from("products")
      .select(PRODUCT_SELECT_WITH_COVER)
      .eq("id", productId)
      .eq("business_id", businessId)
      .maybeSingle();

    let row: Record<string, unknown> | null;

    if (primary.error?.code === "42703") {
      // cover_url column not yet migrated — retry without it
      const fallback = await supabase
        .from("products")
        .select(PRODUCT_SELECT_BASE)
        .eq("id", productId)
        .eq("business_id", businessId)
        .maybeSingle();
      if (fallback.error || !fallback.data) return null;
      row = fallback.data as Record<string, unknown>;
    } else {
      if (primary.error || !primary.data) return null;
      row = primary.data as Record<string, unknown>;
    }

    return withProductDefaults(row);
  } catch {
    return null;
  }
}

export async function getBusinessProducts(businessId: string): Promise<Product[]> {
  try {
    const supabase = createAdminClient();

    const primary = await supabase
      .from("products")
      .select(PRODUCT_SELECT_WITH_COVER)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    let rows: Record<string, unknown>[];

    if (primary.error?.code === "42703") {
      // cover_url column not yet migrated — retry without it
      const fallback = await supabase
        .from("products")
        .select(PRODUCT_SELECT_BASE)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (fallback.error || !fallback.data) return [];
      rows = fallback.data as Record<string, unknown>[];
    } else {
      if (primary.error || !primary.data) return [];
      rows = primary.data as Record<string, unknown>[];
    }

    return rows.map(withProductDefaults);
  } catch {
    return [];
  }
}

export interface CheckoutProduct extends Product {
  business_id: string;
}

export async function getPublicProductById(
  productId: string
): Promise<CheckoutProduct | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, description, price, type, status, access_type, is_public, currency, billing_period, created_at, business_id"
      )
      .eq("id", productId)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    return {
      ...withProductDefaults(row),
      business_id: row.business_id as string,
    };
  } catch {
    return null;
  }
}

export interface ProductContent {
  id: string;
  product_id: string;
  title: string;
  type: string;
  content: string | null;
  position: number;
  created_at: string;
}

export async function getContentById(
  contentId: string,
  productId: string
): Promise<ProductContent | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("product_content")
      .select("id, product_id, title, type, content, position, created_at")
      .eq("id", contentId)
      .eq("product_id", productId)
      .maybeSingle();

    if (error || !data) return null;
    return data as ProductContent;
  } catch {
    return null;
  }
}

export async function getProductContent(productId: string): Promise<ProductContent[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("product_content")
      .select("id, product_id, title, type, content, position, created_at")
      .eq("product_id", productId)
      .order("position", { ascending: true });

    if (error || !data) return [];
    return data as ProductContent[];
  } catch {
    return [];
  }
}

// ─── Student / consumer queries ──────────────────────────────────────────────

export interface ProductMembership {
  id: string;
  product_id: string;
  status: string;
  joined_at: string;
  product_name: string;
  product_description: string | null;
  product_type: string;
  product_access_type: string;
  business_id: string;
  business_name: string;
}

export async function getUserProductMemberships(
  clerkUserId: string
): Promise<ProductMembership[]> {
  try {
    const supabase = createAdminClient();
    const supabaseUserId = await resolveSupabaseUserId(clerkUserId);
    if (!supabaseUserId) return [];

    const { data, error } = await supabase
      .from("product_members")
      .select(
        "id, product_id, status, created_at, products(id, name, description, type, access_type, business_id, businesses(id, name))"
      )
      .eq("user_id", supabaseUserId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return (data as Record<string, unknown>[]).map((row) => {
      const product = (row.products ?? {}) as Record<string, unknown>;
      const business = (product.businesses ?? {}) as Record<string, unknown>;
      return {
        id:                   row.id as string,
        product_id:           row.product_id as string,
        status:               row.status as string,
        joined_at:            row.created_at as string,
        product_name:         (product.name as string) ?? "",
        product_description:  (product.description as string | null) ?? null,
        product_type:         (product.type as string) ?? "curso",
        product_access_type:  normalizeAccessType(product.access_type as string | undefined),
        business_id:          (product.business_id as string) ?? "",
        business_name:        (business.name as string) ?? "Mundo Academy",
      };
    });
  } catch {
    return [];
  }
}

export async function getUserProductMembership(
  clerkUserId: string,
  productId: string
): Promise<{ id: string; status: string } | null> {
  try {
    const supabase = createAdminClient();
    const supabaseUserId = await resolveSupabaseUserId(clerkUserId);
    if (!supabaseUserId) return null;

    const { data, error } = await supabase
      .from("product_members")
      .select("id, status")
      .eq("user_id", supabaseUserId)
      .eq("product_id", productId)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) return null;
    return data as { id: string; status: string };
  } catch {
    return null;
  }
}

export async function getRecentTransactions(
  businessId: string,
  limit = 10
): Promise<Transaction[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("transactions")
      .select("id, amount, currency, status, created_at, product_id, user_id")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return (data as Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      created_at: string;
      product_id: string | null;
      user_id: string | null;
    }>).map((tx) => ({
      id: tx.id,
      amount: Number(tx.amount),
      currency: tx.currency,
      status: tx.status,
      created_at: tx.created_at,
      product_name: null,
      user_email: tx.user_id,
    }));
  } catch {
    return [];
  }
}

// ─── Members queries ──────────────────────────────────────────────────────────

export interface BusinessMember {
  id: string;
  product_id: string;
  product_name: string;
  product_type: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  status: string;
  joined_at: string;
  expires_at: string | null;
  purchase_id: string | null;
  origin: "purchase" | "manual";
}

export async function getBusinessMembers(
  businessId: string,
  limit = 500
): Promise<BusinessMember[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("product_members")
      .select(
        "id, product_id, user_id, purchase_id, status, created_at, products(id, name, type), users(id, email, name)"
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return (data as Record<string, unknown>[]).map((row) => {
      const product = (row.products ?? {}) as Record<string, unknown>;
      const user = (row.users ?? {}) as Record<string, unknown>;
      const purchaseId = (row.purchase_id as string | null) ?? null;
      return {
        id:           row.id as string,
        product_id:   (row.product_id as string) ?? "",
        product_name: (product.name as string) ?? "Sin producto",
        product_type: (product.type as string) ?? "curso",
        user_id:      (row.user_id as string | null) ?? null,
        user_email:   (user.email as string | null) ?? null,
        user_name:    (user.name as string | null) ?? null,
        status:       (row.status as string) ?? "active",
        joined_at:    row.created_at as string,
        expires_at:   null,
        purchase_id:  purchaseId,
        origin:       purchaseId ? "purchase" : "manual",
      };
    });
  } catch {
    return [];
  }
}

export interface MemberSummary {
  activeCount: number;
  newLast30d: number;
  productsWithMembers: number;
  purchaseCount: number;
  manualCount: number;
}

export function summarizeMembers(members: BusinessMember[]): MemberSummary {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let activeCount = 0;
  let newLast30d = 0;
  let purchaseCount = 0;
  let manualCount = 0;
  const productSet = new Set<string>();

  for (const m of members) {
    if (m.status === "active") activeCount++;
    if (new Date(m.joined_at).getTime() >= thirtyDaysAgo) newLast30d++;
    if (m.origin === "purchase") purchaseCount++;
    else manualCount++;
    productSet.add(m.product_id);
  }

  return {
    activeCount,
    newLast30d,
    productsWithMembers: productSet.size,
    purchaseCount,
    manualCount,
  };
}

// ─── Payments queries ─────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  product_id: string | null;
  product_name: string | null;
  buyer_email: string | null;
  buyer_name: string | null;
}

export async function getBusinessPayments(
  businessId: string,
  limit = 200
): Promise<Payment[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("purchases")
      .select(
        "id, amount, currency, status, created_at, stripe_session_id, stripe_payment_intent_id, product_id, products(id, name), users(id, email, name)"
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return (data as Record<string, unknown>[]).map((row) => {
      const product = (row.products ?? {}) as Record<string, unknown>;
      const user = (row.users ?? {}) as Record<string, unknown>;
      return {
        id:                          row.id as string,
        amount:                      Number(row.amount ?? 0),
        currency:                    (row.currency as string) ?? "USD",
        status:                      (row.status as string) ?? "pending",
        created_at:                  row.created_at as string,
        stripe_session_id:           (row.stripe_session_id as string | null) ?? null,
        stripe_payment_intent_id:    (row.stripe_payment_intent_id as string | null) ?? null,
        product_id:                  (row.product_id as string | null) ?? null,
        product_name:                (product.name as string | null) ?? null,
        buyer_email:                 (user.email as string | null) ?? null,
        buyer_name:                  (user.name as string | null) ?? null,
      };
    });
  } catch {
    return [];
  }
}

export interface PaymentSummary {
  totalRevenue: number;
  revenue30d: number;
  successCount: number;
  pendingOrFailedCount: number;
}

export function summarizePayments(payments: Payment[]): PaymentSummary {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let totalRevenue = 0;
  let revenue30d = 0;
  let successCount = 0;
  let pendingOrFailedCount = 0;

  for (const p of payments) {
    if (p.status === "succeeded") {
      totalRevenue += p.amount;
      successCount++;
      if (new Date(p.created_at).getTime() >= thirtyDaysAgo) {
        revenue30d += p.amount;
      }
    } else {
      pendingOrFailedCount++;
    }
  }

  return { totalRevenue, revenue30d, successCount, pendingOrFailedCount };
}

// ─── Analytics queries ────────────────────────────────────────────────────────

export interface DailyRevenue {
  date: string;
  revenue: number;
}

export interface DailyMembers {
  date: string;
  new_members: number;
}

export interface ProductSales {
  product_id: string;
  product_name: string;
  sales: number;
  revenue: number;
}

export interface BusinessAnalytics {
  totalRevenue: number;
  revenue30d: number;
  revenueChange: number;
  totalSales: number;
  sales30d: number;
  activeMembers: number;
  publishedProducts: number;
  avgTicket: number;
  bestSellingProduct: string | null;
  revenueByDay: DailyRevenue[];
  membersByDay: DailyMembers[];
  salesByProduct: ProductSales[];
}

export async function getBusinessAnalytics(businessId: string): Promise<BusinessAnalytics> {
  const empty: BusinessAnalytics = {
    totalRevenue: 0, revenue30d: 0, revenueChange: 0,
    totalSales: 0, sales30d: 0, activeMembers: 0,
    publishedProducts: 0, avgTicket: 0, bestSellingProduct: null,
    revenueByDay: [], membersByDay: [], salesByProduct: [],
  };

  try {
    const supabase = createAdminClient();
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

    const [allTimeTx, thirtyDayTx, prevTx, memberRows, productRows, membersActive, productsPublished] =
      await Promise.all([
        supabase
          .from("transactions")
          .select("amount, product_id")
          .eq("business_id", businessId)
          .eq("status", "succeeded"),
        supabase
          .from("transactions")
          .select("amount, product_id, created_at")
          .eq("business_id", businessId)
          .eq("status", "succeeded")
          .gte("created_at", thirtyDaysAgo),
        supabase
          .from("transactions")
          .select("amount")
          .eq("business_id", businessId)
          .eq("status", "succeeded")
          .gte("created_at", sixtyDaysAgo)
          .lt("created_at", thirtyDaysAgo),
        supabase
          .from("members")
          .select("created_at")
          .eq("business_id", businessId)
          .gte("created_at", thirtyDaysAgo),
        supabase
          .from("products")
          .select("id, name")
          .eq("business_id", businessId),
        supabase
          .from("members")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "active"),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "published"),
      ]);

    type TxRow = { amount: number; product_id: string | null };
    type TxRowFull = TxRow & { created_at: string };

    const allTx = (allTimeTx.data ?? []) as TxRow[];
    const recentTx = (thirtyDayTx.data ?? []) as TxRowFull[];
    const previousTx = (prevTx.data ?? []) as { amount: number }[];
    const members = (memberRows.data ?? []) as { created_at: string }[];
    const products = (productRows.data ?? []) as { id: string; name: string }[];

    const totalRevenue = allTx.reduce((s, t) => s + Number(t.amount), 0);
    const totalSales = allTx.length;
    const revenue30d = recentTx.reduce((s, t) => s + Number(t.amount), 0);
    const sales30d = recentTx.length;
    const prevRevenue = previousTx.reduce((s, t) => s + Number(t.amount), 0);
    const revenueChange =
      prevRevenue > 0 ? Math.round(((revenue30d - prevRevenue) / prevRevenue) * 1000) / 10 : 0;
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    const productNameMap = new Map(products.map((p) => [p.id, p.name]));

    const productAgg = new Map<string, { sales: number; revenue: number }>();
    for (const tx of allTx) {
      const pid = tx.product_id ?? "__unknown__";
      const prev = productAgg.get(pid) ?? { sales: 0, revenue: 0 };
      productAgg.set(pid, { sales: prev.sales + 1, revenue: prev.revenue + Number(tx.amount) });
    }
    const salesByProduct: ProductSales[] = Array.from(productAgg.entries())
      .map(([pid, stats]) => ({
        product_id: pid,
        product_name: productNameMap.get(pid) ?? "Sin producto",
        ...stats,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const bestSellingProduct =
      salesByProduct.length > 0
        ? [...salesByProduct].sort((a, b) => b.sales - a.sales)[0].product_name
        : null;

    const revByDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      revByDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const tx of recentTx) {
      const key = tx.created_at.slice(0, 10);
      if (revByDay.has(key)) revByDay.set(key, (revByDay.get(key) ?? 0) + Number(tx.amount));
    }
    const revenueByDay: DailyRevenue[] = Array.from(revByDay.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    const memByDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      memByDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const m of members) {
      const key = m.created_at.slice(0, 10);
      if (memByDay.has(key)) memByDay.set(key, (memByDay.get(key) ?? 0) + 1);
    }
    const membersByDay: DailyMembers[] = Array.from(memByDay.entries()).map(
      ([date, new_members]) => ({ date, new_members })
    );

    return {
      totalRevenue,
      revenue30d,
      revenueChange,
      totalSales,
      sales30d,
      activeMembers: membersActive.count ?? 0,
      publishedProducts: productsPublished.count ?? 0,
      avgTicket,
      bestSellingProduct,
      revenueByDay,
      membersByDay,
      salesByProduct,
    };
  } catch {
    return empty;
  }
}

// ─── Public marketplace queries ───────────────────────────────────────────────

export interface PublicProduct {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  price: number;
  type: string;
  access_type: string;
  currency: string;
  billing_period: string;
  business_id: string;
  business_name: string;
  created_at: string;
  cover_url: string | null;
}

export interface PublicProductFull extends PublicProduct {
  content_count: number;
}

const PUBLIC_PRODUCT_SELECT_WITH_COVER =
  "id, slug, name, description, price, type, access_type, currency, billing_period, business_id, created_at, cover_url, businesses(id, name)";
const PUBLIC_PRODUCT_SELECT_BASE =
  "id, slug, name, description, price, type, access_type, currency, billing_period, business_id, created_at, businesses(id, name)";

function mapPublicProduct(row: Record<string, unknown>): PublicProduct {
  const biz = (row.businesses ?? {}) as Record<string, unknown>;
  return {
    id:             row.id as string,
    slug:           (row.slug as string | null) ?? null,
    name:           row.name as string,
    description:    (row.description as string | null) ?? null,
    price:          Number(row.price ?? 0),
    type:           (row.type as string) ?? "curso",
    access_type:    normalizeAccessType(row.access_type as string | undefined),
    currency:       (row.currency as string) ?? "USD",
    billing_period: normalizeBillingPeriod(row.billing_period as string | undefined),
    business_id:    (row.business_id as string) ?? "",
    business_name:  (biz.name as string) ?? "Mundo Academy",
    created_at:     row.created_at as string,
    cover_url:      (row.cover_url as string | null) ?? null,
  };
}

export async function getPublicProducts(): Promise<PublicProduct[]> {
  try {
    const supabase = createAdminClient();

    // Filter: status published + access_type is NOT 'manual' (or is null — new products default to null).
    // NOTE: .neq("access_type", "manual") excludes NULL rows (SQL NULL semantics).
    // Use .or() to explicitly include NULLs so newly created products are visible.
    const buildQuery = (select: string) =>
      supabase
        .from("products")
        .select(select)
        .eq("status", "published")
        .or("access_type.neq.manual,access_type.is.null")
        .order("created_at", { ascending: false });

    // Try with cover_url first; gracefully fall back if column doesn't exist yet.
    const primary = await buildQuery(PUBLIC_PRODUCT_SELECT_WITH_COVER);
    let rows: Record<string, unknown>[];

    if (primary.error?.code === "42703") {
      // cover_url column missing — retry without it
      const fallback = await buildQuery(PUBLIC_PRODUCT_SELECT_BASE);
      if (fallback.error || !fallback.data) return [];
      rows = fallback.data as unknown as Record<string, unknown>[];
    } else {
      if (primary.error || !primary.data) return [];
      rows = primary.data as unknown as Record<string, unknown>[];
    }

    return rows.map(mapPublicProduct);
  } catch {
    return [];
  }
}

export async function getPublicProductFull(
  slugOrId: string
): Promise<PublicProductFull | null> {
  try {
    const supabase = createAdminClient();

    const baseSelect =
      "id, slug, name, description, price, type, access_type, currency, billing_period, business_id, created_at, cover_url, businesses(id, name)";

    const buildQuery = () =>
      supabase
        .from("products")
        .select(baseSelect)
        .eq("status", "published")
        .or("access_type.neq.manual,access_type.is.null");

    // Try slug first, then fall back to UUID
    const { data: bySlug } = await buildQuery().eq("slug", slugOrId).maybeSingle();
    const { data: byId }   = bySlug
      ? { data: null }
      : await buildQuery().eq("id", slugOrId).maybeSingle();

    const row = (bySlug ?? byId) as Record<string, unknown> | null;
    if (!row) return null;

    const { count } = await supabase
      .from("product_content")
      .select("id", { count: "exact", head: true })
      .eq("product_id", row.id as string);

    const biz = (row.businesses ?? {}) as Record<string, unknown>;

    return {
      id:            row.id as string,
      slug:          (row.slug as string | null) ?? null,
      name:          row.name as string,
      description:   (row.description as string | null) ?? null,
      price:         Number(row.price ?? 0),
      type:          (row.type as string) ?? "curso",
      access_type:   normalizeAccessType(row.access_type as string | undefined),
      currency:      (row.currency as string) ?? "USD",
      billing_period: normalizeBillingPeriod(row.billing_period as string | undefined),
      business_id:   (row.business_id as string) ?? "",
      business_name: (biz.name as string) ?? "Mundo Academy",
      created_at:    row.created_at as string,
      cover_url:     (row.cover_url as string | null) ?? null,
      content_count: count ?? 0,
    };
  } catch {
    return null;
  }
}

// ─── Payment links queries ────────────────────────────────────────────────────

export interface PaymentLink {
  id: string;
  business_id: string;
  product_id: string;
  product_name: string;
  title: string;
  slug: string;
  active: boolean;
  created_at: string;
}

export const PAYMENT_LINKS_MIGRATION_SQL = `-- Run in your Supabase SQL editor
CREATE TABLE IF NOT EXISTS payment_links (
  id           uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id  uuid         NOT NULL,
  product_id   uuid         NOT NULL,
  title        text         NOT NULL,
  slug         text         UNIQUE NOT NULL,
  active       boolean      DEFAULT true NOT NULL,
  created_at   timestamptz  DEFAULT now() NOT NULL
);`;

export interface PaymentLinksResult {
  links: PaymentLink[];
  tableExists: boolean;
}

export async function getBusinessPaymentLinks(
  businessId: string
): Promise<PaymentLinksResult> {
  const supabase = createAdminClient();

  // Step 1 — query payment_links without any join
  const { data, error } = await supabase
    .from("payment_links")
    .select("id, business_id, product_id, title, slug, active, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    // 42P01 = undefined_table; anything else is a real query error but table exists
    const tableExists = error.code !== "42P01";
    console.error("[payment_links] query error:", error.code, error.message);
    return { links: [], tableExists };
  }

  if (!data || data.length === 0) {
    return { links: [], tableExists: true };
  }

  // Step 2 — resolve product names via a separate in-query (no FK required)
  const rows = data as Array<{
    id: string; business_id: string; product_id: string;
    title: string; slug: string; active: boolean; created_at: string;
  }>;

  const productIds = [...new Set(rows.map((r) => r.product_id))];
  const { data: productData } = await supabase
    .from("products")
    .select("id, name")
    .in("id", productIds);

  const productNameMap = new Map(
    (productData ?? []).map((p) => [(p as Record<string, unknown>).id as string, (p as Record<string, unknown>).name as string])
  );

  const links: PaymentLink[] = rows.map((row) => ({
    id:           row.id,
    business_id:  row.business_id,
    product_id:   row.product_id,
    product_name: productNameMap.get(row.product_id) ?? "Sin producto",
    title:        row.title,
    slug:         row.slug,
    active:       Boolean(row.active),
    created_at:   row.created_at,
  }));

  return { links, tableExists: true };
}

export async function getPaymentLinkBySlug(
  slug: string
): Promise<{ product_id: string; active: boolean } | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("payment_links")
      .select("product_id, active")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return { product_id: data.product_id as string, active: Boolean(data.active) };
  } catch {
    return null;
  }
}

// ─── Customer queries ─────────────────────────────────────────────────────────

export interface BusinessCustomer {
  user_id: string;
  name: string | null;
  email: string | null;
  totalSpent: number;
  totalOrders: number;
  firstPurchase: string;
  lastPurchase: string;
  activeProductsCount: number;
  activeProductNames: string[];
  isRepeatBuyer: boolean;
  stripeSessionIds: string[];
}

export interface CustomerSummary {
  totalCustomers: number;
  totalRevenue: number;
  avgLtv: number;
  repeatBuyers: number;
  newLast30d: number;
}

export async function getBusinessCustomers(
  businessId: string,
  limit = 500
): Promise<BusinessCustomer[]> {
  try {
    const supabase = createAdminClient();

    // Step 1 — query purchases without nested joins
    const { data: purchaseData, error } = await supabase
      .from("purchases")
      .select("id, user_id, amount, product_id, created_at, stripe_session_id")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !purchaseData || purchaseData.length === 0) return [];

    type PurchaseRow = {
      id: string;
      user_id: string | null;
      amount: number | null;
      product_id: string | null;
      created_at: string;
      stripe_session_id: string | null;
    };

    const purchases = purchaseData as PurchaseRow[];
    const userIds = [
      ...new Set(purchases.map((p) => p.user_id).filter(Boolean)),
    ] as string[];
    if (userIds.length === 0) return [];

    // Step 2 — resolve user names/emails via separate query (no FK required)
    const { data: userData } = await supabase
      .from("users")
      .select("id, email, name")
      .in("id", userIds);

    const userMap = new Map(
      (
        (userData ?? []) as Array<{
          id: string;
          email: string | null;
          name: string | null;
        }>
      ).map((u) => [u.id, { email: u.email, name: u.name }])
    );

    // Step 3 — resolve active product_members for these users via separate query
    const { data: memberData } = await supabase
      .from("product_members")
      .select("user_id, product_id")
      .eq("business_id", businessId)
      .eq("status", "active")
      .in("user_id", userIds);

    const memberRows = (memberData ?? []) as Array<{
      user_id: string;
      product_id: string;
    }>;
    const activeProductIds = [...new Set(memberRows.map((m) => m.product_id))];

    // Step 4 — resolve product names via separate query
    const { data: productData } = activeProductIds.length
      ? await supabase
          .from("products")
          .select("id, name")
          .in("id", activeProductIds)
      : { data: [] };

    const productNameMap = new Map(
      (
        (productData ?? []) as Array<{ id: string; name: string }>
      ).map((p) => [p.id, p.name])
    );

    // Step 5 — group purchases by user_id in memory
    const byUser = new Map<
      string,
      { amounts: number[]; dates: string[]; stripeIds: string[] }
    >();

    for (const p of purchases) {
      if (!p.user_id) continue;
      if (!byUser.has(p.user_id)) {
        byUser.set(p.user_id, { amounts: [], dates: [], stripeIds: [] });
      }
      const entry = byUser.get(p.user_id)!;
      entry.amounts.push(Number(p.amount ?? 0));
      entry.dates.push(p.created_at);
      if (p.stripe_session_id) entry.stripeIds.push(p.stripe_session_id);
    }

    // Step 6 — build active product names per user
    const userActiveProducts = new Map<string, string[]>();
    for (const m of memberRows) {
      if (!userActiveProducts.has(m.user_id))
        userActiveProducts.set(m.user_id, []);
      const pName = productNameMap.get(m.product_id);
      if (pName) userActiveProducts.get(m.user_id)!.push(pName);
    }

    // Step 7 — assemble customer records
    const customers: BusinessCustomer[] = [];
    for (const [userId, agg] of byUser.entries()) {
      const user = userMap.get(userId);
      const sortedDates = [...agg.dates].sort();
      const activeProductNames = userActiveProducts.get(userId) ?? [];
      customers.push({
        user_id: userId,
        name: user?.name ?? null,
        email: user?.email ?? null,
        totalSpent: agg.amounts.reduce((s, a) => s + a, 0),
        totalOrders: agg.amounts.length,
        firstPurchase: sortedDates[0],
        lastPurchase: sortedDates[sortedDates.length - 1],
        activeProductsCount: activeProductNames.length,
        activeProductNames,
        isRepeatBuyer: agg.amounts.length > 1,
        stripeSessionIds: agg.stripeIds,
      });
    }

    customers.sort((a, b) => b.totalSpent - a.totalSpent);
    return customers;
  } catch {
    return [];
  }
}

export function summarizeCustomers(
  customers: BusinessCustomer[]
): CustomerSummary {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const repeatBuyers = customers.filter((c) => c.isRepeatBuyer).length;
  const newLast30d = customers.filter(
    (c) => new Date(c.firstPurchase).getTime() >= thirtyDaysAgo
  ).length;

  return {
    totalCustomers: customers.length,
    totalRevenue,
    avgLtv: customers.length > 0 ? totalRevenue / customers.length : 0,
    repeatBuyers,
    newLast30d,
  };
}

// ─── Invoices (internal receipts) ────────────────────────────────────────────

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  product_id: string | null;
  product_name: string | null;
  buyer_id: string | null;
  buyer_email: string | null;
  buyer_name: string | null;
}

export async function getBusinessInvoices(businessId: string): Promise<Invoice[]> {
  try {
    const supabase = createAdminClient();

    // Step 1 — purchases ordered ASC so sequential invoice numbers are stable
    const { data: purchaseData, error } = await supabase
      .from("purchases")
      .select(
        "id, amount, currency, status, created_at, stripe_session_id, stripe_payment_intent_id, product_id, user_id"
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });

    if (error || !purchaseData || purchaseData.length === 0) return [];

    type PurchaseRow = {
      id: string;
      amount: number | null;
      currency: string | null;
      status: string;
      created_at: string;
      stripe_session_id: string | null;
      stripe_payment_intent_id: string | null;
      product_id: string | null;
      user_id: string | null;
    };

    const purchases = purchaseData as PurchaseRow[];

    // Step 2 — collect unique ids
    const productIds = [
      ...new Set(purchases.map((p) => p.product_id).filter(Boolean)),
    ] as string[];
    const userIds = [
      ...new Set(purchases.map((p) => p.user_id).filter(Boolean)),
    ] as string[];

    // Step 3 — resolve products
    const { data: productData } = productIds.length
      ? await supabase.from("products").select("id, name").in("id", productIds)
      : { data: [] };

    const productMap = new Map(
      ((productData ?? []) as { id: string; name: string }[]).map((p) => [
        p.id,
        p.name,
      ])
    );

    // Step 4 — resolve users
    const { data: userData } = userIds.length
      ? await supabase
          .from("users")
          .select("id, email, name")
          .in("id", userIds)
      : { data: [] };

    const userMap = new Map(
      (
        (userData ?? []) as {
          id: string;
          email: string | null;
          name: string | null;
        }[]
      ).map((u) => [u.id, { email: u.email, name: u.name }])
    );

    // Step 5 — assign sequential invoice numbers per year
    const yearCounters = new Map<number, number>();
    const invoices: Invoice[] = purchases.map((p) => {
      const year = new Date(p.created_at).getFullYear();
      const seq = (yearCounters.get(year) ?? 0) + 1;
      yearCounters.set(year, seq);

      const user = p.user_id ? userMap.get(p.user_id) : undefined;
      return {
        id: p.id,
        invoiceNumber: `INV-${year}-${String(seq).padStart(4, "0")}`,
        amount: Number(p.amount ?? 0),
        currency: (p.currency ?? "USD").toUpperCase(),
        status: p.status ?? "pending",
        created_at: p.created_at,
        stripe_session_id: p.stripe_session_id,
        stripe_payment_intent_id: p.stripe_payment_intent_id,
        product_id: p.product_id,
        product_name: p.product_id ? (productMap.get(p.product_id) ?? null) : null,
        buyer_id: p.user_id,
        buyer_email: user?.email ?? null,
        buyer_name: user?.name ?? null,
      };
    });

    // Reverse so newest appears first in UI
    return invoices.reverse();
  } catch {
    return [];
  }
}

export async function getInvoiceById(
  invoiceId: string,
  businessId: string
): Promise<Invoice | null> {
  const all = await getBusinessInvoices(businessId);
  return all.find((inv) => inv.id === invoiceId) ?? null;
}

// ─── Manual invoices ──────────────────────────────────────────────────────────

export const MANUAL_INVOICES_SQL = `CREATE TABLE IF NOT EXISTS manual_invoices (
  id                uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id       uuid         NOT NULL,
  product_id        uuid,
  customer_email    text         NOT NULL,
  description       text,
  amount            numeric      NOT NULL DEFAULT 0,
  currency          text         DEFAULT 'USD' NOT NULL,
  status            text         DEFAULT 'draft' NOT NULL,
  due_date          timestamptz,
  invoice_number    text,
  payment_link_slug text,
  created_at        timestamptz  DEFAULT now() NOT NULL
);`;

export interface ManualInvoice {
  id: string;
  business_id: string;
  product_id: string | null;
  product_name: string | null;
  customer_email: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  invoice_number: string;
  payment_link_slug: string | null;
  created_at: string;
}

export interface ManualInvoicesResult {
  invoices: ManualInvoice[];
  tableExists: boolean;
}

export async function getBusinessManualInvoices(
  businessId: string
): Promise<ManualInvoicesResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("manual_invoices")
      .select(
        "id, business_id, product_id, customer_email, description, amount, currency, status, due_date, invoice_number, payment_link_slug, created_at"
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      const tableExists = error.code !== "42P01";
      console.error("[manual_invoices] query error:", error.code, error.message);
      return { invoices: [], tableExists };
    }

    if (!data || data.length === 0) return { invoices: [], tableExists: true };

    type Row = {
      id: string; business_id: string; product_id: string | null;
      customer_email: string; description: string | null;
      amount: number | null; currency: string | null; status: string;
      due_date: string | null; invoice_number: string | null;
      payment_link_slug: string | null; created_at: string;
    };

    const rows = data as Row[];
    const productIds = [
      ...new Set(rows.map((r) => r.product_id).filter(Boolean)),
    ] as string[];

    const { data: productData } = productIds.length
      ? await supabase.from("products").select("id, name").in("id", productIds)
      : { data: [] };

    const productMap = new Map(
      ((productData ?? []) as { id: string; name: string }[]).map((p) => [
        p.id,
        p.name,
      ])
    );

    const invoices: ManualInvoice[] = rows.map((r) => ({
      id: r.id,
      business_id: r.business_id,
      product_id: r.product_id,
      product_name: r.product_id ? (productMap.get(r.product_id) ?? null) : null,
      customer_email: r.customer_email,
      description: r.description,
      amount: Number(r.amount ?? 0),
      currency: (r.currency ?? "USD").toUpperCase(),
      status: r.status ?? "draft",
      due_date: r.due_date,
      invoice_number: r.invoice_number ?? "",
      payment_link_slug: r.payment_link_slug,
      created_at: r.created_at,
    }));

    return { invoices, tableExists: true };
  } catch {
    return { invoices: [], tableExists: false };
  }
}

export async function getManualInvoiceById(
  invoiceId: string,
  businessId: string
): Promise<ManualInvoice | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("manual_invoices")
      .select(
        "id, business_id, product_id, customer_email, description, amount, currency, status, due_date, invoice_number, payment_link_slug, created_at"
      )
      .eq("id", invoiceId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error || !data) return null;

    type Row = {
      id: string; business_id: string; product_id: string | null;
      customer_email: string; description: string | null;
      amount: number | null; currency: string | null; status: string;
      due_date: string | null; invoice_number: string | null;
      payment_link_slug: string | null; created_at: string;
    };
    const r = data as Row;

    let productName: string | null = null;
    if (r.product_id) {
      const { data: prod } = await supabase
        .from("products")
        .select("name")
        .eq("id", r.product_id)
        .maybeSingle();
      productName = (prod as { name: string } | null)?.name ?? null;
    }

    return {
      id: r.id,
      business_id: r.business_id,
      product_id: r.product_id,
      product_name: productName,
      customer_email: r.customer_email,
      description: r.description,
      amount: Number(r.amount ?? 0),
      currency: (r.currency ?? "USD").toUpperCase(),
      status: r.status ?? "draft",
      due_date: r.due_date,
      invoice_number: r.invoice_number ?? "",
      payment_link_slug: r.payment_link_slug,
      created_at: r.created_at,
    };
  } catch {
    return null;
  }
}
