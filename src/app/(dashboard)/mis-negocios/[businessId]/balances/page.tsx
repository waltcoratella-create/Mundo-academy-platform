import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import {
  getBusinessById,
  getBusinessPayments,
  summarizePayments,
} from "@/lib/supabase/queries";
import { BalancesClient } from "@/components/dashboard/balances-client";

export default async function BalancesPage({
  params,
}: {
  params: { businessId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const payments = await getBusinessPayments(business.id);
  const summary = summarizePayments(payments);

  return (
    <BalancesClient
      payments={payments}
      summary={summary}
      businessName={business.name}
    />
  );
}
