import { currentUser } from "@clerk/nextjs/server";

/**
 * Canonical Pro entitlement.
 *
 * Source of truth: Clerk `publicMetadata`, written exclusively by the Stripe
 * webhook when the *platform Pro* subscription (STRIPE_PRO_PRICE_ID) changes.
 * Creator/product subscriptions live in Supabase (`members` / `product_members`)
 * and must never influence this — they are a different entitlement entirely.
 *
 * Every Pro-gated surface must go through `hasProAccess()` / `getProEntitlement()`
 * so the answer is identical everywhere (sidebar, /mis-negocios, apps, checkout).
 */

export interface ProEntitlement {
  isPro: boolean;
  subscriptionId: string | null;
  /** Mirrors the Stripe subscription status at the time of the last webhook. */
  status: string | null;
  /** ISO timestamp; access survives until this moment even after cancellation. */
  currentPeriodEnd: string | null;
  reason: "active" | "expired" | "none" | "anonymous";
}

const NO_ACCESS: ProEntitlement = {
  isPro: false,
  subscriptionId: null,
  status: null,
  currentPeriodEnd: null,
  reason: "none",
};

/** Metadata keys the webhook writes. `stripeSubscriptionId` is the legacy name. */
interface ProMetadata {
  isPro?: unknown;
  stripeSubscriptionId?: unknown;
  proStatus?: unknown;
  proCurrentPeriodEnd?: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Pure entitlement resolution — exported so it can be reasoned about and tested
 * without a Clerk session.
 *
 * Cancellation is handled by Stripe, not here: a subscription cancelled at
 * period end stays `active` until it lapses, and only then does Stripe emit
 * `customer.subscription.deleted`. So "cancelled but still paid up" keeps
 * access, which is the intended product behaviour.
 *
 * `currentPeriodEnd` is enforced only when present. Accounts provisioned before
 * the webhook recorded it have no such field, and must not lose access because
 * of a metadata shape change.
 */
export function resolveProEntitlement(metadata: unknown): ProEntitlement {
  const meta = (metadata ?? {}) as ProMetadata;

  const subscriptionId = asString(meta.stripeSubscriptionId);
  const status = asString(meta.proStatus);
  const currentPeriodEnd = asString(meta.proCurrentPeriodEnd);

  if (meta.isPro !== true) {
    return { ...NO_ACCESS, subscriptionId, status, currentPeriodEnd };
  }

  if (currentPeriodEnd) {
    const endsAt = Date.parse(currentPeriodEnd);
    if (Number.isFinite(endsAt) && endsAt <= Date.now()) {
      return {
        isPro: false,
        subscriptionId,
        status,
        currentPeriodEnd,
        reason: "expired",
      };
    }
  }

  return { isPro: true, subscriptionId, status, currentPeriodEnd, reason: "active" };
}

/** Full entitlement for the signed-in user. */
export async function getProEntitlement(): Promise<ProEntitlement> {
  const user = await currentUser();
  if (!user) return { ...NO_ACCESS, reason: "anonymous" };
  return resolveProEntitlement(user.publicMetadata);
}

/** Boolean shorthand used by ProGate and any other Pro-gated surface. */
export async function hasProAccess(): Promise<boolean> {
  const { isPro } = await getProEntitlement();
  return isPro;
}
