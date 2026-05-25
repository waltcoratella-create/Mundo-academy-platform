import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getBusinessById, getBusinessProducts } from "@/lib/supabase/queries";
import { CreateInvoiceClient } from "@/components/dashboard/create-invoice-client";

export default async function CreateInvoicePage({
  params,
}: {
  params: { businessId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const products = await getBusinessProducts(business.id);

  return (
    <CreateInvoiceClient
      businessId={business.id}
      businessName={business.name}
      products={products}
    />
  );
}
