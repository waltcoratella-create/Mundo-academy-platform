import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Megaphone } from "lucide-react";
import { getBusinessById } from "@/lib/supabase/queries";
import { BusinessPlaceholder } from "@/components/dashboard/business-placeholder";

export default async function AnunciosPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();
  return (
    <BusinessPlaceholder
      icon={Megaphone}
      title="Anuncios"
      description="Publica anuncios y comunicados para tu comunidad."
      businessName={business.name}
    />
  );
}
