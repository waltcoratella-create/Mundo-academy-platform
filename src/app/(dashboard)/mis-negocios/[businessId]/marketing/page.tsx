import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { getBusinessById } from "@/lib/supabase/queries";
import { BusinessPlaceholder } from "@/components/dashboard/business-placeholder";

export default async function MarketingPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();
  return (
    <BusinessPlaceholder
      icon={TrendingUp}
      title="Marketing"
      description="Crea campañas y estrategias para crecer tu audiencia."
      businessName={business.name}
    />
  );
}
