"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { createProduct } from "@/app/actions/products";

const TYPES = [
  { value: "curso",     label: "Curso" },
  { value: "comunidad", label: "Comunidad" },
  { value: "ebook",     label: "Ebook" },
  { value: "mentoria",  label: "Mentoría" },
  { value: "evento",    label: "Evento" },
  { value: "servicio",  label: "Servicio" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {pending ? "Guardando..." : "Crear producto"}
    </button>
  );
}

export default function NuevoProductoPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const [state, formAction] = useFormState(createProduct, { error: null });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href={`/mis-negocios/${businessId}/productos`}
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-6"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Volver a Productos
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo producto</h1>

      <form action={formAction} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <input type="hidden" name="businessId" value={businessId} />

        {state.error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nombre del producto <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            type="text"
            placeholder="Ej: Curso de marketing digital"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Descripción
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Describe brevemente tu producto..."
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition resize-none"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Precio (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">$</span>
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
              className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Type + Status in a row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tipo de producto
            </label>
            <select
              name="type"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition bg-white"
            >
              {TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Estado
            </label>
            <select
              name="status"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition bg-white"
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <Link
            href={`/mis-negocios/${businessId}/productos`}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancelar
          </Link>
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
