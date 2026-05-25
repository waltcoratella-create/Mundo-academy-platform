import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getBusinessById, getInvoiceById } from "@/lib/supabase/queries";
import { InvoiceDetailClient } from "@/components/dashboard/invoice-detail-client";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { businessId: string; invoiceId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const invoice = await getInvoiceById(params.invoiceId, business.id);
  if (!invoice) notFound();

  return (
    <InvoiceDetailClient
      invoice={invoice}
      businessId={business.id}
      businessName={business.name}
    />
  );
}
