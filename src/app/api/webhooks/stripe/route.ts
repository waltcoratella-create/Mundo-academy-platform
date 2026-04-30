import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { clerkClient } from "@clerk/nextjs/server";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const clerk = await clerkClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (userId && session.payment_status === "paid") {
        await clerk.users.updateUser(userId, {
          publicMetadata: {
            isPro: true,
            stripeSubscriptionId: session.subscription as string,
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      // TODO: look up Clerk userId from stripeSubscriptionId stored in Supabase
      // then set publicMetadata.isPro = false
      // Requires: Supabase table mapping clerk_user_id → stripe_subscription_id
      console.warn("subscription.deleted — access revocation not yet implemented");
      break;
    }

    case "invoice.payment_failed": {
      // TODO: notify user via Resend, optionally pause access after N failures
      console.warn("invoice.payment_failed — notification not yet implemented");
      break;
    }
  }

  return NextResponse.json({ received: true });
}
