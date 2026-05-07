import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { getBusinessById } from "@/lib/supabase/queries";
import { BusinessPlaceholder } from "@/components/dashboard/business-placeholder";

export default async function TarjetasPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();
  return (
    <BusinessPlaceholder
      icon={LayoutGrid}
      title="Tarjetas"
      description="Gestiona las tarjetas y métodos de pago de tu negocio."
      businessName={business.name}
    />
  );
}
