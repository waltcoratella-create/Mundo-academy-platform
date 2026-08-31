import "server-only";
import { getMetaConnectionForBusiness } from "@/lib/meta/connections";
import type { MetaAccountBinding } from "./create/campaign-types";
import { NO_META_ACCOUNT } from "./create/campaign-types";

/**
 * The connected ad account, reduced to what the builder may know.
 *
 * Resolved once per render and shared by the create page, the edit page and the
 * draft loader so the three cannot disagree about which currency and zone rule.
 * Callers must have verified ownership already.
 *
 * The two flags answer different questions on purpose:
 *
 *  · `bound` — an ad account has been chosen, so we know the currency and zone
 *    this business advertises in. An `expired` (or `error`) connection still
 *    knows them: the token stopped working, the account did not change. Letting
 *    the builder drift back to a product currency in that window is exactly the
 *    silent mismatch we are trying to prevent.
 *
 *  · `apiAvailable` — the credential is good for a live Graph call. Only a
 *    `connected` status qualifies; anything else must reconnect first.
 */
export async function getMetaAccountBinding(businessId: string): Promise<MetaAccountBinding> {
  const connection = await getMetaConnectionForBusiness(businessId);

  // No connection at all, or one that has not picked an account yet: nothing
  // is known, so nothing is imposed.
  if (!connection || !connection.adAccountId) return NO_META_ACCOUNT;

  return {
    bound: true,
    apiAvailable: connection.status === "connected",
    adAccountId: connection.adAccountId,
    adAccountName: connection.adAccountName,
    currency: connection.adAccountCurrency,
    timezone: connection.adAccountTimezone,
  };
}
