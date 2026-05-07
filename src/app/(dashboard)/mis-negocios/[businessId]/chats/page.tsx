import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getBusinessById } from "@/lib/supabase/queries";
import { BusinessPlaceholder } from "@/components/dashboard/business-placeholder";

export default async function ChatsPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();
  return (
    <BusinessPlaceholder
      icon={MessageCircle}
      title="Chats de apoyo"
      description="Gestiona las conversaciones de soporte con tus miembros."
      businessName={business.name}
    />
  );
}
