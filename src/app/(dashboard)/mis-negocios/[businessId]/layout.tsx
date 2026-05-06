import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { BusinessSidebar } from "@/components/sidebar/business-sidebar";
import { getBusinessById } from "@/lib/supabase/queries";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { businessId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  return (
    <div className="flex h-full overflow-hidden">
      <BusinessSidebar businessId={params.businessId} businessName={business.name} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
