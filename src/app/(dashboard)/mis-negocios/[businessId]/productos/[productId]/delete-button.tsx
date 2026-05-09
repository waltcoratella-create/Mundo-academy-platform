"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deleteProduct } from "@/app/actions/products";

function DeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {pending
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Eliminando...</>
        : <><Trash2 className="w-3.5 h-3.5" />Sí, eliminar</>
      }
    </button>
  );
}

export function DeleteProductButton({
  businessId,
  productId,
  productName,
}: {
  businessId: string;
  productId: string;
  productName: string;
}) {
  const [state, formAction] = useFormState(deleteProduct, { error: null });
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Eliminar
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl border border-red-100 bg-red-50">
      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
      <p className="text-xs text-red-700 flex-1">
        ¿Eliminar <strong>{productName}</strong>? Esta acción no se puede deshacer.
      </p>
      {state.error && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}
      <form action={formAction} className="flex items-center gap-1.5 shrink-0">
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="productId"  value={productId} />
        <DeleteSubmit />
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-white transition-colors"
        >
          Cancelar
        </button>
      </form>
    </div>
  );
}
