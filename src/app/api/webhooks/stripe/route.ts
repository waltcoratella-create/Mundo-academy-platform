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

/** Map a Stripe subscription status to the members.status enum. */
function memberStatusFromStripe(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "trialing": return "trial";
    case "active": return "active";
    case "past_due":
    case "paused": return "paused";
    default: return "cancelled"; // canceled | unpaid | incomplete | incomplete_expired
  }
}

/**
 * Create or update the analytics `members` row for (business, product, user).
 * Find-then-write (no reliance on a unique constraint) so it works before and
 * after the stripe-sales migration. Returns the member id, or null.
 */
async function upsertBusinessMember(
  supabase: ReturnType<typeof createAdminClient>,
  args: {
    businessId: string;
    productId: string;
    userId: string;
    status: string;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: string | null;
  }
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("business_id", args.businessId)
    .eq("product_id", args.productId)
    .eq("user_id", args.userId)
    .maybeSingle();

  const fields = {
    status: args.status,
    stripe_subscription_id: args.stripeSubscriptionId,
    current_period_end: args.currentPeriodEnd,
  };

  if (existing?.id) {
    const { error } = await supabase.from("members").update(fields).eq("id", existing.id);
    if (error) console.error("[member] update error:", error.message);
    return existing.id as string;
  }

  const { data: created, error } = await supabase
    .from("members")
    .insert({
      business_id: args.businessId,
      product_id: args.productId,
      user_id: args.userId,
      ...fields,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[member] insert error:", error.message);
    return null;
  }
  console.log("[member] created:", created?.id);
  return (created?.id as string) ?? null;
}

/** Resolve the current_period_end of a subscription (ISO) — null on failure. */
async function subscriptionPeriodEnd(subscriptionId: string): Promise<{ end: string | null; status: Stripe.Subscription.Status | null }> {
  try {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    return {
      end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      status: sub.status,
    };
  } catch {
    return { end: null, status: null };
  }
}

/**
 * True if a transaction for this checkout session / payment intent already
 * exists (Stripe retries webhooks — inserts must be idempotent). Falls back to
 * the payment-intent check if stripe_session_id hasn't been migrated yet (42703).
 */
async function transactionExists(
  supabase: ReturnType<typeof createAdminClient>,
  sessionId: string | null,
  paymentIntentId: string | null
): Promise<boolean> {
  if (sessionId) {
    const bySession = await supabase
      .from("transactions").select("id").eq("stripe_session_id", sessionId).maybeSingle();
    if (!bySession.error) return !!bySession.data;
    if (bySession.error.code !== "42703") return false;
  }
  if (paymentIntentId) {
    const byPi = await supabase
      .from("transactions").select("id").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
    return !!byPi.data;
  }
  return false;
}

/** Insert a transaction; retries without stripe_session_id if not migrated yet. */
async function insertTransaction(
  supabase: ReturnType<typeof createAdminClient>,
  row: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("transactions").insert(row);
  if (error?.code === "42703" && "stripe_session_id" in row) {
    const { stripe_session_id: _omit, ...rest } = row;
    const retry = await supabase.from("transactions").insert(rest);
    if (retry.error) console.error("[tx] insert error (fallback):", retry.error.message);
    return;
  }
  if (error) {
    // 23505 = unique violation → a concurrent retry already inserted it; that's fine.
    if (error.code === "23505") console.log("[tx] duplicate ignored (unique index)");
    else console.error("[tx] insert error:", error.message);
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

  // Idempotency: Stripe retries webhooks — never double-count a sale.
  if (await transactionExists(supabase, session.id, paymentIntentId)) {
    console.log("[purchase] transaction already recorded for session — skipping");
    return;
  }

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

  // Analytics member (members table feeds new-users / MRR / ARR)
  const { end: periodEnd } = subscriptionId
    ? await subscriptionPeriodEnd(subscriptionId)
    : { end: null };
  const analyticsMemberId = await upsertBusinessMember(supabase, {
    businessId,
    productId,
    userId: supabaseUserId,
    status: "active",
    stripeSubscriptionId: subscriptionId,
    currentPeriodEnd: periodEnd,
  });

  await insertTransaction(supabase, {
    business_id: businessId,
    product_id: productId,
    member_id: analyticsMemberId,
    user_id: supabaseUserId,
    amount,
    currency,
    status: "succeeded",
    stripe_payment_intent_id: paymentIntentId,
    stripe_session_id: session.id,
  });
  console.log("[purchase] transaction recorded:", { amount, currency, paymentIntentId });
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

      case "payment_intent.succeeded": {
        // Checkout payments are recorded via checkout.session.completed; this
        // handler only guards against gaps. Without our metadata there is no
        // business/product context, so we log and skip (idempotent either way).
        const pi = event.data.object as Stripe.PaymentIntent;
        const supabase = createAdminClient();
        if (await transactionExists(supabase, null, pi.id)) {
          console.log("[pi.succeeded] already recorded — skipping");
          break;
        }
        const { productId, businessId, clerkUserId } = (pi.metadata ?? {}) as Record<string, string | undefined>;
        if (!productId || !businessId) {
          console.log("[pi.succeeded] no product metadata — handled by session.completed");
          break;
        }
        const buyerId = clerkUserId
          ? await resolveOrCreateSupabaseUser(clerk, clerkUserId, pi.receipt_email ?? null)
          : null;
        await insertTransaction(supabase, {
          business_id: businessId,
          product_id: productId,
          member_id: null,
          user_id: buyerId,
          amount: (pi.amount_received ?? pi.amount ?? 0) / 100,
          currency: (pi.currency ?? "usd").toUpperCase(),
          status: "succeeded",
          stripe_payment_intent_id: pi.id,
          stripe_session_id: null,
        });
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

        // Subscription renewal for a business product → renewal transaction +
        // extend the member period. The FIRST invoice (subscription_create) is
        // already recorded by checkout.session.completed — skip it here.
        if (subscriptionId && invoice.billing_reason === "subscription_cycle") {
          const supabase = createAdminClient();
          const { data: member } = await supabase
            .from("members")
            .select("id, business_id, product_id, user_id")
            .eq("stripe_subscription_id", subscriptionId)
            .maybeSingle();

          if (member) {
            const invoicePi = typeof invoice.payment_intent === "string"
              ? invoice.payment_intent
              : invoice.payment_intent?.id ?? null;
            const dedupKey = invoicePi ?? `invoice_${invoice.id}`;

            if (!(await transactionExists(supabase, null, dedupKey))) {
              await insertTransaction(supabase, {
                business_id: member.business_id,
                product_id: member.product_id,
                member_id: member.id,
                user_id: member.user_id,
                amount: (invoice.amount_paid ?? 0) / 100,
                currency: (invoice.currency ?? "usd").toUpperCase(),
                status: "succeeded",
                stripe_payment_intent_id: dedupKey,
                stripe_session_id: null,
              });
              console.log("[invoice.paid] renewal transaction recorded for member:", member.id);
            }

            const periodEnd = invoice.lines?.data?.[0]?.period?.end;
            if (periodEnd) {
              await supabase
                .from("members")
                .update({ status: "active", current_period_end: new Date(periodEnd * 1000).toISOString() })
                .eq("id", member.id);
            }
          }
        }

        const email = await resolveEmailFromInvoice(invoice);
        if (email) {
          await grantProByEmail(clerk, email, subscriptionId);
        } else {
          console.warn(`${event.type} — could not resolve customer email`);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const supabase = createAdminClient();
        const { error } = await supabase
          .from("members")
          .update({
            status: memberStatusFromStripe(sub.status),
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          })
          .eq("stripe_subscription_id", sub.id);
        if (error) console.error(`[${event.type}] member update error:`, error.message);
        else console.log(`[${event.type}] member synced for sub:`, sub.id, "→", memberStatusFromStripe(sub.status));
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        // Cancel the analytics member tied to this subscription
        {
          const supabase = createAdminClient();
          const { error } = await supabase
            .from("members")
            .update({ status: "cancelled" })
            .eq("stripe_subscription_id", sub.id);
          if (error) console.error("[subscription.deleted] member cancel error:", error.message);
          else console.log("[subscription.deleted] member cancelled for sub:", sub.id);
        }

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

      case "charge.refunded": {
        // Record a `refunded` transaction so Analytics net revenue and the
        // payment breakdown update (and Realtime pushes it to the dashboard).
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id ?? null;
        if (!piId) { console.warn("[charge.refunded] no payment_intent — skipping"); break; }

        const supabase = createAdminClient();
        const { data: original } = await supabase
          .from("transactions")
          .select("business_id, product_id, member_id, user_id, currency")
          .eq("stripe_payment_intent_id", piId)
          .eq("status", "succeeded")
          .maybeSingle();

        if (!original) {
          console.warn("[charge.refunded] no original transaction for pi:", piId);
          break;
        }

        // One row per refund object (partial refunds fire multiple events).
        const refundId = charge.refunds?.data?.[0]?.id ?? charge.id;
        const refundAmount = (charge.refunds?.data?.[0]?.amount ?? charge.amount_refunded ?? 0) / 100;
        const dedupKey = `refund_${refundId}`;

        if (await transactionExists(supabase, null, dedupKey)) {
          console.log("[charge.refunded] refund already recorded — skipping");
          break;
        }

        await insertTransaction(supabase, {
          business_id: original.business_id,
          product_id: original.product_id,
          member_id: original.member_id,
          user_id: original.user_id,
          amount: refundAmount,
          currency: original.currency ?? (charge.currency ?? "usd").toUpperCase(),
          status: "refunded",
          stripe_payment_intent_id: dedupKey,
          stripe_session_id: null,
        });
        console.log("[charge.refunded] refund recorded:", { refundAmount, piId });
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
