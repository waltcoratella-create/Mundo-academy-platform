export type UserRole = "learner" | "builder" | "investor" | "mentor" | "admin";

export type BusinessType =
  | "course"
  | "community"
  | "service"
  | "subscription"
  | "mentoring"
  | "digital_product"
  | "agency"
  | "saas";

export type BusinessStatus =
  | "draft"
  | "active"
  | "paused"
  | "archived";

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  type: BusinessType;
  status: BusinessStatus;
  cover_image_url: string | null;
  logo_url: string | null;
  mrr: number;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_period: "one_time" | "monthly" | "annual";
  stripe_price_id: string | null;
  active: boolean;
  created_at: string;
}

export interface Member {
  id: string;
  business_id: string;
  user_id: string;
  status: "trial" | "active" | "cancelled" | "paused";
  product_id: string;
  current_period_end: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  member_id: string;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  stripe_payment_intent_id: string | null;
  created_at: string;
}

export interface StartupListing {
  id: string;
  founder_id: string;
  name: string;
  sector: string;
  stage: "idea" | "pre_seed" | "seed" | "series_a";
  country: string;
  mrr: number;
  mrr_growth: number;
  raising_amount: number;
  valuation: number;
  equity_offered: number;
  pitch_deck_url: string | null;
  video_pitch_url: string | null;
  status: "draft" | "review" | "public" | "in_talks" | "closed";
  created_at: string;
}

export interface VentureAIProfile {
  stage: "idea" | "validating" | "first_sales" | "scaling" | "investing";
  monthly_revenue: "0" | "1_1k" | "1k_10k" | "10k_50k" | "50k_plus";
  goal: "launch" | "scale" | "invest" | "raise" | "learn";
  sector: string;
  weekly_hours: "less_5" | "5_20" | "20_plus" | "fulltime";
  main_blocker: string;
  score?: number;
}

export interface KpiCard {
  label: string;
  value: string;
  change: number;
  changeLabel?: string;
}
