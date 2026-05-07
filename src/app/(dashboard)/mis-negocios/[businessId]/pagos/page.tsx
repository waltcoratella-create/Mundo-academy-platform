import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { CreditCard } from "lucide-react";
import { getBusinessById } from "@/lib/supabase/queries";
import { BusinessPlaceholder } from "@/components/dashboard/business-placeholder";

export default async function PagosPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();
  return (
    <BusinessPlaceholder
      icon={CreditCard}
      title="Pagos"
      description="Consulta y gestiona los pagos de tus miembros."
      businessName={business.name}
    />
  );
}
