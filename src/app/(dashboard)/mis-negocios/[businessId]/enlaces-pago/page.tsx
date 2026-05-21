import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getBusinessById, getBusinessPaymentLinks, getBusinessProducts } from "@/lib/supabase/queries";
import { PaymentLinksClient } from "@/components/dashboard/payment-links-client";

export default async function EnlacesPagoPage({
  params,
  searchParams,
}: {
  params: { businessId: string };
  searchParams: { created?: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const [{ links, tableExists }, products] = await Promise.all([
    getBusinessPaymentLinks(business.id),
    getBusinessProducts(business.id),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <PaymentLinksClient
      businessId={business.id}
      businessName={business.name}
      links={links}
      products={products}
      tableExists={tableExists}
      showCreated={searchParams.created === "1"}
      appUrl={appUrl}
    />
  );
}
