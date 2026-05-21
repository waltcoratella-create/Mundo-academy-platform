import { createAdminClient } from "./admin";
import { normalizeAccessType, normalizeBillingPeriod } from "@/lib/constants/products";

export interface Business {
  id: string;
  name: string;
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
  };
}

export async function getProductById(
  productId: string,
  businessId: string
): Promise<Product | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, price, type, status, access_type, is_public, currency, billing_period, created_at")
      .eq("id", productId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error || !data) return null;
    return withProductDefaults(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function getBusinessProducts(businessId: string): Promise<Product[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, price, type, status, access_type, is_public, currency, billing_period, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(withProductDefaults);
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
}

export interface PublicProductFull extends PublicProduct {
  content_count: number;
}

export async function getPublicProducts(): Promise<PublicProduct[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, slug, name, description, price, type, access_type, currency, billing_period, business_id, created_at, businesses(id, name)"
      )
      .eq("status", "published")
      .eq("is_public", true)
      .neq("access_type", "manual")
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return (data as Record<string, unknown>[]).map((row) => {
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
      };
    });
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
      "id, slug, name, description, price, type, access_type, currency, billing_period, business_id, created_at, businesses(id, name)";

    const buildQuery = () =>
      supabase
        .from("products")
        .select(baseSelect)
        .eq("status", "published")
        .eq("is_public", true);

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
      content_count: count ?? 0,
    };
  } catch {
    return null;
  }
}
