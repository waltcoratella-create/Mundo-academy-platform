import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getBusinessById, getBusinessSettings } from "@/lib/supabase/queries";
import { SettingsCenter } from "@/components/dashboard/settings-form";
import { getMetaConnectionForBusiness } from "@/lib/meta/connections";
import { MetaConnectionPanel } from "./MetaConnectionPanel";
import { DsaSettingsPanel } from "./DsaSettingsPanel";
import { getDsaSettings } from "@/lib/meta/ad-settings";

export default async function ConfiguracionesPage({
  params,
  searchParams,
}: {
  params: { businessId: string };
  searchParams: { updated?: string; meta?: string; meta_error?: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const settings = await getBusinessSettings(business.id);
  if (!settings) notFound();

  // Safe fields only — MetaConnection has no token field by construction.
  const metaConnection = await getMetaConnectionForBusiness(business.id);
  // A missing table or read error shows the empty form rather than breaking
  // the whole settings page; saving will surface the real error.
  const dsaSettings = await getDsaSettings(business.id).catch(() => null);

  return (
    <>
      <SettingsCenter
        settings={settings}
        showSuccess={searchParams.updated === "1"}
      />
      <div className="max-w-3xl mx-auto px-5 pb-10">
        <MetaConnectionPanel
          businessId={business.id}
          connection={metaConnection}
          flashError={searchParams.meta_error}
          justConnected={searchParams.meta === "connected"}
        />
        <DsaSettingsPanel businessId={business.id} initial={dsaSettings} />
      </div>
    </>
  );
}
