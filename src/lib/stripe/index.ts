import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-09-30.acacia",
  typescript: true,
});

export async function createConnectAccount(email: string) {
  return stripe.accounts.create({
    type: "express",
    email,
    capabilities: { transfers: { requested: true } },
  });
}

export async function createConnectOnboardingLink(accountId: string, returnUrl: string) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: returnUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

export async function createPaymentLink(priceId: string, connectedAccountId: string) {
  return stripe.paymentLinks.create(
    { line_items: [{ price: priceId, quantity: 1 }] },
    { stripeAccount: connectedAccountId }
  );
}
