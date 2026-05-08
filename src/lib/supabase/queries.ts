import { createAdminClient } from "./admin";

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
    return data as Product;
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
    return data as Product[];
  } catch {
    return [];
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
