"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function MisNegociosError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900">Algo salió mal</h2>
          <p className="text-gray-500 text-sm">
            No se pudo cargar el dashboard. Intenta de nuevo.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center w-full px-4 py-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Reintentar
          </button>
          <Link
            href="/crear"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Crear un nuevo negocio
          </Link>
        </div>
      </div>
    </div>
  );
}
