import { getPublicProducts } from "@/lib/supabase/queries";
import { DiscoverClient } from "./discover-client";

// Must be dynamic: getPublicProducts needs runtime env vars (Supabase).
// Without this, Next.js pre-renders the page at build time when env vars are
// absent, caches the empty result, and serves it to every visitor.
export const dynamic = "force-dynamic";

export default async function DescubrirPage() {
  const products = await getPublicProducts();
  return <DiscoverClient products={products} />;
}
