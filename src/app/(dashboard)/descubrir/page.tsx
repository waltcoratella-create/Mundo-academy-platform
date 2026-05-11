import { Compass } from "lucide-react";
import { getPublicProducts } from "@/lib/supabase/queries";
import { DiscoverClient } from "./discover-client";

export default async function DescubrirPage() {
  const products = await getPublicProducts();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm shrink-0">
          <Compass className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Descubrir</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Explora los mejores productos del ecosistema Mundo Academy
          </p>
        </div>
      </div>

      <DiscoverClient products={products} />
    </div>
  );
}
