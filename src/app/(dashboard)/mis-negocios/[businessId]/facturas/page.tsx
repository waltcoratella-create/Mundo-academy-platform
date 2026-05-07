import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getBusinessById } from "@/lib/supabase/queries";
import { BusinessPlaceholder } from "@/components/dashboard/business-placeholder";

export default async function FacturasPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();
  return (
    <BusinessPlaceholder
      icon={FileText}
      title="Facturas"
      description="Revisa y descarga las facturas generadas por tu negocio."
      businessName={business.name}
    />
  );
}
