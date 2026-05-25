import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";
import { getPublicProductById } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { productId } = body as { productId?: string };
  if (!productId) {
    return NextResponse.json({ error: "productId requerido" }, { status: 400 });
  }

  const product = await getPublicProductById(productId);
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }
  if (product.status !== "published") {
    return NextResponse.json({ error: "Producto no disponible" }, { status: 400 });
  }
  if (product.access_type === "manual") {
    return NextResponse.json({ error: "Este producto requiere invitación" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const successUrl = `${appUrl}/checkout/${productId}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl  = `${appUrl}/checkout/${productId}`;

  // Free product — grant access directly, skip Stripe
  if (product.access_type === "free") {
    const user  = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
    const name  = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;

    const supabase = createAdminClient();

    // Upsert buyer — they may not have a business and therefore no users row yet
    const { data: userRow } = await supabase
      .from("users")
      .upsert({ clerk_id: userId, email, name }, { onConflict: "clerk_id" })
      .select("id")
      .single();

    if (userRow) {
      await supabase.from("product_members").upsert(
        {
          product_id: productId,
          business_id: product.business_id,
          user_id: userRow.id,
          status: "active",
        },
        { onConflict: "product_id,user_id" }
      );
    }
    return NextResponse.json({ url: `${appUrl}/checkout/${productId}/success?free=1` });
  }

  // Paid product
  if (!product.price || product.price <= 0) {
    return NextResponse.json({ error: "Este producto no tiene un precio válido" }, { status: 400 });
  }

  const stripe = getStripe();

  const user  = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  const commonParams = {
    metadata: {
      productId,
      clerkUserId: userId,
      businessId: product.business_id,
    },
    client_reference_id: userId,
    ...(email ? { customer_email: email } : {}),
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  const currency    = product.currency.toLowerCase();
  const unitAmount  = Math.round(product.price * 100);
  const productData = {
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
  };

  const isSubscription = product.access_type === "subscription";

  let sessionUrl: string | null;

  if (isSubscription) {
    const interval = product.billing_period === "annual" ? "year" : "month";
    const session = await stripe.checkout.sessions.create({
      ...commonParams,
      mode: "subscription",
      line_items: [{
        price_data: {
          currency,
          unit_amount: unitAmount,
          recurring: { interval },
          product_data: productData,
        },
        quantity: 1,
      }],
    });
    sessionUrl = session.url;
  } else {
    const session = await stripe.checkout.sessions.create({
      ...commonParams,
      mode: "payment",
      line_items: [{
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: productData,
        },
        quantity: 1,
      }],
    });
    sessionUrl = session.url;
  }

  return NextResponse.json({ url: sessionUrl });
}
