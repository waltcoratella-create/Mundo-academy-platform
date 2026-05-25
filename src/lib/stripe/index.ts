import Stripe from "stripe";

let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

export async function createConnectAccount(email: string) {
  return getStripe().accounts.create({
    type: "express",
    email,
    capabilities: { transfers: { requested: true } },
  });
}

export async function createConnectOnboardingLink(accountId: string, returnUrl: string) {
  return getStripe().accountLinks.create({
    account: accountId,
    refresh_url: returnUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

export async function createPaymentLink(priceId: string, connectedAccountId: string) {
  return getStripe().paymentLinks.create(
    { line_items: [{ price: priceId, quantity: 1 }] },
    { stripeAccount: connectedAccountId }
  );
}
