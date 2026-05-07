import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Code2 } from "lucide-react";
import { getBusinessById } from "@/lib/supabase/queries";
import { BusinessPlaceholder } from "@/components/dashboard/business-placeholder";

export default async function DesarrolladorPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();
  return (
    <BusinessPlaceholder
      icon={Code2}
      title="Desarrollador"
      description="Accede a webhooks, API keys y herramientas para desarrolladores."
      businessName={business.name}
    />
  );
}
