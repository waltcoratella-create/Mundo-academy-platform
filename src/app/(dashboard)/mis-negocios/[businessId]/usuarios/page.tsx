import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import {
  getBusinessById,
  getBusinessMembers,
  getBusinessCustomers,
  summarizeMembers,
  summarizeCustomers,
} from "@/lib/supabase/queries";
import { MembersClient } from "@/components/dashboard/members-client";

export default async function UsuariosPage({
  params,
}: {
  params: { businessId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const [members, customers] = await Promise.all([
    getBusinessMembers(business.id),
    getBusinessCustomers(business.id),
  ]);

  const memberSummary = summarizeMembers(members);
  const customerSummary = summarizeCustomers(customers);

  return (
    <MembersClient
      members={members}
      summary={memberSummary}
      customers={customers}
      customerSummary={customerSummary}
      businessName={business.name}
    />
  );
}
