import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Wallet } from "lucide-react";
import { getBusinessById } from "@/lib/supabase/queries";
import { BusinessPlaceholder } from "@/components/dashboard/business-placeholder";

export default async function BalancesPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();
  return (
    <BusinessPlaceholder
      icon={Wallet}
      title="Balances"
      description="Revisa el balance y los fondos disponibles de tu negocio."
      businessName={business.name}
    />
  );
}
