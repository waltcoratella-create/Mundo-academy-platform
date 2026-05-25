import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import {
  getBusinessById,
  getInvoiceById,
  getManualInvoiceById,
} from "@/lib/supabase/queries";
import { InvoiceDetailClient } from "@/components/dashboard/invoice-detail-client";
import type { InvoiceView } from "@/components/dashboard/invoice-detail-client";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { businessId: string; invoiceId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  // Try purchase receipt first, then manual invoice
  const [purchaseInvoice, manualInvoice] = await Promise.all([
    getInvoiceById(params.invoiceId, business.id),
    getManualInvoiceById(params.invoiceId, business.id),
  ]);

  let invoiceView: InvoiceView | null = null;

  if (purchaseInvoice) {
    invoiceView = {
      kind: "purchase",
      id: purchaseInvoice.id,
      invoiceNumber: purchaseInvoice.invoiceNumber,
      amount: purchaseInvoice.amount,
      currency: purchaseInvoice.currency,
      status: purchaseInvoice.status,
      created_at: purchaseInvoice.created_at,
      buyer_email: purchaseInvoice.buyer_email,
      buyer_name: purchaseInvoice.buyer_name,
      product_id: purchaseInvoice.product_id,
      product_name: purchaseInvoice.product_name,
      stripe_session_id: purchaseInvoice.stripe_session_id,
      stripe_payment_intent_id: purchaseInvoice.stripe_payment_intent_id,
      due_date: null,
      description: null,
    };
  } else if (manualInvoice) {
    invoiceView = {
      kind: "manual",
      id: manualInvoice.id,
      invoiceNumber: manualInvoice.invoice_number,
      amount: manualInvoice.amount,
      currency: manualInvoice.currency,
      status: manualInvoice.status,
      created_at: manualInvoice.created_at,
      buyer_email: manualInvoice.customer_email,
      buyer_name: null,
      product_id: manualInvoice.product_id,
      product_name: manualInvoice.product_name,
      stripe_session_id: null,
      stripe_payment_intent_id: null,
      due_date: manualInvoice.due_date,
      description: manualInvoice.description,
    };
  }

  if (!invoiceView) notFound();

  return (
    <InvoiceDetailClient
      invoice={invoiceView}
      businessId={business.id}
      businessName={business.name}
    />
  );
}
