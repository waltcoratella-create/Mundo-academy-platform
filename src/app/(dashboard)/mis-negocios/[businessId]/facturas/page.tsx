import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import {
  getBusinessById,
  getBusinessInvoices,
} from "@/lib/supabase/queries";
import { InvoicesClient } from "@/components/dashboard/invoices-client";

export default async function FacturasPage({
  params,
}: {
  params: { businessId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const invoices = await getBusinessInvoices(business.id);

  return (
    <InvoicesClient
      invoices={invoices}
      businessId={business.id}
      businessName={business.name}
    />
  );
}
