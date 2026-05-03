import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { clerkClient } from "@clerk/nextjs/server";
import type Stripe from "stripe";

async function grantProByUserId(
  clerk: Awaited<ReturnType<typeof clerkClient>>,
  userId: string,
  subscriptionId?: string
) {
  await clerk.users.updateUser(userId, {
    publicMetadata: {
      isPro: true,
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
    },
  });
  console.log(`Pro granted to userId: ${userId}`);
}

async function grantProByEmail(
  clerk: Awaited<ReturnType<typeof clerkClient>>,
  email: string,
  subscriptionId?: string
) {
  const result = await clerk.users.getUserList({ emailAddress: [email] });
  const user = result.data[0];
  if (!user) {
    console.warn(`No Clerk user found for email: ${email}`);
    return;
  }
  await grantProByUserId(clerk, user.id, subscriptionId);
}

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

  console.log("Stripe event:", event.type);

  const clerk = await clerkClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (userId && session.payment_status === "paid") {
        await grantProByUserId(clerk, userId, session.subscription as string);
      } else if (session.customer_email) {
        await grantProByEmail(clerk, session.customer_email, session.subscription as string);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const email = invoice.customer_email;
      const subscriptionId = typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;
      if (email) {
        await grantProByEmail(clerk, email, subscriptionId);
      } else {
        console.warn("invoice.payment_succeeded — no customer_email on invoice");
      }
      break;
    }

    case "customer.subscription.deleted": {
      console.warn("subscription.deleted — access revocation not yet implemented");
      break;
    }

    case "invoice.payment_failed": {
      console.warn("invoice.payment_failed — notification not yet implemented");
      break;
    }
  }

  return NextResponse.json({ received: true });
}
