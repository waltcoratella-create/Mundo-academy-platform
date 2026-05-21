import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getBusinessById, getBusinessMembers, summarizeMembers } from "@/lib/supabase/queries";
import { MembersClient } from "@/components/dashboard/members-client";

export default async function UsuariosPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const members = await getBusinessMembers(business.id);
  const summary = summarizeMembers(members);

  return (
    <MembersClient
      members={members}
      summary={summary}
      businessName={business.name}
    />
  );
}
