import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import {
  getBusinessById,
  getBusinessInvoices,
  getBusinessManualInvoices,
  MANUAL_INVOICES_SQL,
} from "@/lib/supabase/queries";
import { InvoicesClient } from "@/components/dashboard/invoices-client";
import type { DisplayInvoice } from "@/components/dashboard/invoices-client";

export default async function FacturasPage({
  params,
}: {
  params: { businessId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  // Load both sources in parallel
  const [purchaseInvoices, manualResult] = await Promise.all([
    getBusinessInvoices(business.id),
    getBusinessManualInvoices(business.id),
  ]);

  // Map purchase receipts → DisplayInvoice
  const purchaseDisplay: DisplayInvoice[] = purchaseInvoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    amount: inv.amount,
    currency: inv.currency,
    status: inv.status,
    created_at: inv.created_at,
    buyer_email: inv.buyer_email,
    buyer_name: inv.buyer_name,
    product_name: inv.product_name,
    kind: "purchase",
  }));

  // Map manual invoices → DisplayInvoice
  const manualDisplay: DisplayInvoice[] = manualResult.invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    amount: inv.amount,
    currency: inv.currency,
    status: inv.status,
    created_at: inv.created_at,
    buyer_email: inv.customer_email,
    buyer_name: null,
    product_name: inv.product_name,
    kind: "manual",
  }));

  // Merge and sort by date descending
  const allInvoices: DisplayInvoice[] = [
    ...purchaseDisplay,
    ...manualDisplay,
  ].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <InvoicesClient
      invoices={allInvoices}
      businessId={business.id}
      businessName={business.name}
      tableExists={manualResult.tableExists}
      migrationSQL={MANUAL_INVOICES_SQL}
    />
  );
}
