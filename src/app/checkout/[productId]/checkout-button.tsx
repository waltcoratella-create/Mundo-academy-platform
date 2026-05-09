"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Loader2, ShoppingCart, Gift, LogIn } from "lucide-react";

export function CheckoutButton({
  productId,
  accessType,
  price,
}: {
  productId: string;
  accessType: string;
  price: number;
}) {
  const { isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const isFree = accessType === "free";

  if (!isSignedIn) {
    return (
      <Link
        href={`/sign-in?redirect_url=/checkout/${productId}`}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
      >
        <LogIn className="w-4 h-4" />
        Inicia sesión para {isFree ? "obtener acceso" : "comprar"}
      </Link>
    );
  }

  async function handleBuy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Error al iniciar el pago. Inténtalo de nuevo.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 text-center px-4 py-2.5 rounded-lg bg-red-50 border border-red-100">
          {error}
        </p>
      )}
      <button
        onClick={handleBuy}
        disabled={loading}
        className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          isFree
            ? "bg-green-600 hover:bg-green-700 text-white"
            : "bg-gray-900 hover:bg-gray-800 text-white"
        }`}
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</>
          : isFree
            ? <><Gift className="w-4 h-4" />Obtener acceso gratis</>
            : <><ShoppingCart className="w-4 h-4" />Comprar acceso</>
        }
      </button>
    </div>
  );
}
