import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { getBusinessById } from "@/lib/supabase/queries";
import { BusinessPlaceholder } from "@/components/dashboard/business-placeholder";

export default async function ProductosPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();
  return (
    <BusinessPlaceholder
      icon={Package}
      title="Productos"
      description="Crea y gestiona los productos de tu negocio."
      businessName={business.name}
    />
  );
}
