import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { getBusinessById } from "@/lib/supabase/queries";
import { BusinessPlaceholder } from "@/components/dashboard/business-placeholder";

export default async function UsuariosPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();
  return (
    <BusinessPlaceholder
      icon={Users}
      title="Usuarios"
      description="Administra los miembros y accesos de tu negocio."
      businessName={business.name}
    />
  );
}
