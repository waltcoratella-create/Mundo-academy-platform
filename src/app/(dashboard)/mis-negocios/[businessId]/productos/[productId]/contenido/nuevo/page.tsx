"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { createProductContent } from "@/app/actions/products";

const TYPES = [
  { value: "texto",  label: "Texto" },
  { value: "video",  label: "Video" },
  { value: "enlace", label: "Enlace" },
  { value: "pdf",    label: "PDF" },
];

const CONTENT_META: Record<string, { label: string; placeholder: string }> = {
  texto:  { label: "Contenido",       placeholder: "Escribe el contenido de esta lección..." },
  video:  { label: "URL del video",   placeholder: "https://youtube.com/watch?v=..." },
  enlace: { label: "URL del enlace",  placeholder: "https://..." },
  pdf:    { label: "URL del PDF",     placeholder: "https://... o enlace al documento" },
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {pending ? "Guardando..." : "Guardar contenido"}
    </button>
  );
}

export default function NuevoContenidoPage() {
  const { businessId, productId } = useParams<{ businessId: string; productId: string }>();
  const [state, formAction] = useFormState(createProductContent, { error: null });
  const [selectedType, setSelectedType] = useState("texto");

  const base = `/mis-negocios/${businessId}/productos/${productId}`;
  const meta = CONTENT_META[selectedType] ?? CONTENT_META.texto;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href={`${base}/contenido`}
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-6"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Volver a Contenido
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo contenido</h1>

      <form action={formAction} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="productId"  value={productId} />

        {state.error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            required
            type="text"
            placeholder="Ej: Lección 1 — Introducción"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tipo de contenido
          </label>
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedType(value)}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  selectedType === value
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input type="hidden" name="type" value={selectedType} />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {meta.label}
          </label>
          <textarea
            name="content"
            rows={4}
            placeholder={meta.placeholder}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <Link
            href={`${base}/contenido`}
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
