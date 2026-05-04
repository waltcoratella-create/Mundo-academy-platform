"use client";

import { useTransition } from "react";
import { Zap, Loader2 } from "lucide-react";
import { createFirstBusiness } from "@/app/actions/business";

export function CreateBusinessButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => createFirstBusiness())}
      className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Creando negocio…
        </>
      ) : (
        <>
          <Zap className="w-4 h-4" />
          Crear mi primer negocio
        </>
      )}
    </button>
  );
}
