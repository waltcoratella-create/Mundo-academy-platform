import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { getBusinessById } from "@/lib/supabase/queries";
import { BusinessPlaceholder } from "@/components/dashboard/business-placeholder";

export default async function ConfiguracionesPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();
  return (
    <BusinessPlaceholder
      icon={Settings}
      title="Configuraciones"
      description="Personaliza el nombre, apariencia y ajustes de tu negocio."
      businessName={business.name}
    />
  );
}
