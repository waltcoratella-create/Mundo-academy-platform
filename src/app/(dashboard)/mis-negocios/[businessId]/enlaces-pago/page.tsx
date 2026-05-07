import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Link2 } from "lucide-react";
import { getBusinessById } from "@/lib/supabase/queries";
import { BusinessPlaceholder } from "@/components/dashboard/business-placeholder";

export default async function EnlacesPagoPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();
  return (
    <BusinessPlaceholder
      icon={Link2}
      title="Enlaces de pago"
      description="Crea enlaces de pago para vender tus productos fácilmente."
      businessName={business.name}
    />
  );
}
