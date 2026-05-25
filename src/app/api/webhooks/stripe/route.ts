import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

type ClerkInstance = Awaited<ReturnType<typeof clerkClient>>;

async function resolveOrCreateSupabaseUser(
  clerk: ClerkInstance,
  clerkUserId: string,
  fallbackEmail: string | null
): Promise<string | null> {
  const supabase = createAdminClient();

  // Fast path: user already exists in Supabase
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();

  if (existingUser) {
    console.log("[purchase] buyer supabase id (existing):", existingUser.id);
    return existingUser.id;
  }

  // Slow path: buyer has never created a business — fetch from Clerk and upsert
  console.log("[purchase] buyer not in supabase, upserting from clerk:", clerkUserId);
  try {
    const clerkUser = await clerk.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? fallbackEmail ?? "";
    const name  = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

    console.log("[purchase] clerk buyer email:", email);

    const { data: newUser, error } = await supabase
      .from("users")
      .upsert({ clerk_id: clerkUserId, email, name }, { onConflict: "clerk_id" })
      .select("id")
      .single();

    if (error) {
      console.error("[purchase] upsert user error:", error.message);
      return null;
    }

    console.log("[purchase] buyer supabase id (created):", newUser.id);
    return newUser.id;
  } catch (err) {
    console.error("[purchase] failed to fetch clerk user:", err);
    return null;
  }
}

async function handleProductPurchase(
  session: Stripe.Checkout.Session,
  clerk: ClerkInstance
): Promise<void> {
  const { productId, clerkUserId, businessId } = session.metadata ?? {};

  console.log("[purchase] session.id:", session.id);
  console.log("[purchase] productId:", productId);
  console.log("[purchase] clerkUserId (buyer):", clerkUserId);
  console.log("[purchase] businessId:", businessId);
  console.log("[purchase] customer_email:", session.customer_email);

  if (!productId || !clerkUserId || !businessId) {
    console.error("[purchase] missing metadata — aborting");
    return;
  }

  const supabaseUserId = await resolveOrCreateSupabaseUser(
    clerk,
    clerkUserId,
    session.customer_email ?? null
  );

  console.log("[purchase] final supabaseUserId:", supabaseUserId);

  const supabase = createAdminClient();

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  const amount   = (session.amount_total ?? 0) / 100;
  const currency = (session.currency ?? "usd").toUpperCase();

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      business_id: businessId,
      product_id: productId,
      user_id: supabaseUserId,
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_subscription_id: subscriptionId,
      amount,
      currency,
      status: "succeeded",
    })
    .select("id")
    .single();

  if (purchaseError) {
    console.error("[purchase] insert purchase error:", purchaseError.message);
  } else {
    console.log("[purchase] purchase row created:", purchase?.id);
  }

  if (!supabaseUserId) {
    console.error("[purchase] no supabaseUserId — product_members NOT inserted");
    return;
  }

  const { error: memberError } = await supabase.from("product_members").upsert(
    {
      product_id: productId,
      business_id: businessId,
      user_id: supabaseUserId,
      purchase_id: purchase?.id ?? null,
      status: "active",
    },
    { onConflict: "product_id,user_id" }
  );

  if (memberError) {
    console.error("[purchase] product_members upsert error:", memberError.message);
  } else {
    console.log("[purchase] product_members upserted — user has access");
  }

  await supabase.from("transactions").insert({
    business_id: businessId,
    product_id: productId,
    user_id: supabaseUserId,
    amount,
    currency,
    status: "succeeded",
  });
}

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

async function resolveEmailFromCustomerId(customerId: string): Promise<string | null> {
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if (customer.deleted) return null;
    return (customer as Stripe.Customer).email ?? null;
  } catch {
    console.warn(`Failed to retrieve Stripe customer: ${customerId}`);
    return null;
  }
}

async function resolveEmailFromInvoice(invoice: Stripe.Invoice): Promise<string | null> {
  if (invoice.customer_email) return invoice.customer_email;

  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return null;
  return resolveEmailFromCustomerId(customerId);
}

async function findClerkUserByEmail(clerk: ClerkInstance, email: string) {
  const result = await clerk.users.getUserList({ emailAddress: [email] });
  return result.data[0] ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("Stripe event received:", event.type);

  const clerk = await clerkClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Product purchase (metadata.productId set by /api/checkout/product)
        if (session.metadata?.productId) {
          await handleProductPurchase(session, clerk);
          break;
        }

        // Platform subscription (existing logic)
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
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const email = await resolveEmailFromCustomerId(customerId);
        if (email) {
          const user = await findClerkUserByEmail(clerk, email);
          if (user) {
            console.log("Clerk user id:", user.id);
            await clerk.users.updateUser(user.id, {
              publicMetadata: { isPro: false, stripeSubscriptionId: null },
            });
            console.log("Subscription cancelled — Pro access revoked");
          } else {
            console.warn(`subscription.deleted — no Clerk user found for email: ${email}`);
          }
        } else {
          console.warn("subscription.deleted — could not resolve customer email");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = await resolveEmailFromInvoice(invoice);
        console.log("Payment failed — customer email:", email ?? "unknown");
        if (email) {
          const user = await findClerkUserByEmail(clerk, email);
          if (user) {
            console.log("Clerk user id:", user.id);
            await clerk.users.updateUser(user.id, {
              publicMetadata: {
                ...((user.publicMetadata as Record<string, unknown>) ?? {}),
                paymentStatus: "failed",
              },
            });
            console.log("Payment failed — paymentStatus recorded (Pro not revoked yet)");
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  return NextResponse.json({ received: true });
}
