import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { clerkClient } from "@clerk/nextjs/server";
import type Stripe from "stripe";

type ClerkInstance = Awaited<ReturnType<typeof clerkClient>>;

async function grantProByUserId(clerk: ClerkInstance, userId: string, subscriptionId?: string) {
  console.log("Clerk user id:", userId);
  await clerk.users.updateUser(userId, {
    publicMetadata: {
      isPro: true,
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
    },
  });
  console.log("Updated user to Pro");
}

async function grantProByEmail(clerk: ClerkInstance, email: string, subscriptionId?: string) {
  const result = await clerk.users.getUserList({ emailAddress: [email] });
  const user = result.data[0];
  if (!user) {
    console.warn(`No Clerk user found for email: ${email}`);
    return;
  }
  await grantProByUserId(clerk, user.id, subscriptionId);
}

async function resolveEmailFromInvoice(invoice: Stripe.Invoice): Promise<string | null> {
  if (invoice.customer_email) return invoice.customer_email;

  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return null;

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return (customer as Stripe.Customer).email ?? null;
  } catch {
    console.warn(`Failed to retrieve Stripe customer: ${customerId}`);
    return null;
  }
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

  console.log("Stripe event received:", event.type);

  const clerk = await clerkClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : undefined;

        const userId =
          session.client_reference_id ??
          (session.metadata?.clerkUserId as string | undefined) ??
          null;

        if (userId) {
          await grantProByUserId(clerk, userId, subscriptionId);
        } else if (session.customer_email) {
          await grantProByEmail(clerk, session.customer_email, subscriptionId);
        } else {
          console.warn("checkout.session.completed — could not resolve userId or email");
        }
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

        const email = await resolveEmailFromInvoice(invoice);
        if (email) {
          await grantProByEmail(clerk, email, subscriptionId);
        } else {
          console.warn(`${event.type} — could not resolve customer email`);
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
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  return NextResponse.json({ received: true });
}
