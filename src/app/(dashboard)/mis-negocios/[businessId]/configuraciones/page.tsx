import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getBusinessById, getBusinessSettings } from "@/lib/supabase/queries";
import { SettingsCenter } from "@/components/dashboard/settings-form";

export default async function ConfiguracionesPage({
  params,
  searchParams,
}: {
  params: { businessId: string };
  searchParams: { updated?: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const settings = await getBusinessSettings(business.id);
  if (!settings) notFound();

  return (
    <SettingsCenter
      settings={settings}
      showSuccess={searchParams.updated === "1"}
    />
  );
}
