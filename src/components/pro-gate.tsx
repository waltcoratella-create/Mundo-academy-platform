import { hasProAccess } from "@/lib/access";
import { UpgradeCTA } from "@/components/upgrade-cta";

export async function ProGate({ children }: { children: React.ReactNode }) {
  const isPro = await hasProAccess();
  if (!isPro) return <UpgradeCTA />;
  return <>{children}</>;
}
