import { getPublicProducts } from "@/lib/supabase/queries";
import { DiscoverClient } from "./discover-client";

export default async function DescubrirPage() {
  const products = await getPublicProducts();
  return <DiscoverClient products={products} />;
}
