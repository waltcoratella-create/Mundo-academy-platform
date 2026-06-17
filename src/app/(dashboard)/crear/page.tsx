"use client";

import { useState, useRef, useTransition } from "react";
import { Sparkles, Link2, SquarePen, Mic, ArrowUp, Loader2 } from "lucide-react";
import { createFirstBusiness } from "@/app/actions/business";

// ─── Static content (visual only) ──────────────────────────────────────────────

const CREATE_MODES: { id: string; icon: React.ElementType; title: string; desc: string }[] = [
  { id: "ai",   icon: Sparkles,  title: "Crear con IA",      desc: "Usa inteligencia artificial para ayudarte a configurar tu negocio automáticamente." },
  { id: "url",  icon: Link2,     title: "Crear desde URL",   desc: "Importa un negocio o producto desde una URL existente." },
  { id: "zero", icon: SquarePen, title: "Crear desde cero",  desc: "Configura manualmente tu negocio paso a paso." },
];

const POPULAR = [
  "Curso de IA",
  "Academia Fitness",
  "Agencia Growth",
  "Newsletter Premium",
  "Comunidad de Trading",
  "Podcast Premium",
];

export default function CrearPage() {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Real creation flow — unchanged backend call.
  function handleCreate() {
    const name = query.trim() || "Mi negocio";
    startTransition(() => createFirstBusiness(name, "course"));
  }

  const canCreate = query.trim().length > 0 && !isPending;

  function focusInput() {
    inputRef.current?.focus();
  }

  function pickPopular(text: string) {
    setQuery(text);
    focusInput();
  }

  function onModeClick(id: string) {
    // "Crear desde cero" starts the real flow with a default business; the
    // other modes simply focus the AI box (no backend wired for URL import).
    if (id === "zero") handleCreate();
    else focusInput();
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canCreate) handleCreate();
    }
  }

  return (
    <div className="font-inter bg-white min-h-full">
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-16">

        {/* Header */}
        <header className="mb-6">
          <h1 className="text-[28px] font-bold leading-[34px] tracking-[-1.03px] text-[#202020]">
            Crear negocio
          </h1>
          <p className="mt-3 text-[18px] font-normal leading-7 text-[rgba(0,0,0,0.62)]">
            Crea un negocio completo en menos de 2 minutos con AI.
          </p>
        </header>

        {/* ── AI box — the hero element ─────────────────────────────────────── */}
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.09)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-[rgba(0,0,0,0.2)] transition-colors">
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            rows={3}
            placeholder="Describe tu idea..."
            className="w-full resize-none bg-transparent px-5 pt-5 pb-2 text-[16px] leading-6 text-[#202020] placeholder-[rgba(0,0,0,0.38)] outline-none"
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <button
              type="button"
              aria-label="Dictar por voz"
              className="w-9 h-9 rounded-[14px] flex items-center justify-center text-[rgba(0,0,0,0.55)] hover:bg-[rgba(0,0,0,0.05)] transition-colors"
            >
              <Mic className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate}
              aria-label="Crear negocio"
              className="w-9 h-9 rounded-[14px] flex items-center justify-center bg-[#202020] text-white transition-opacity disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>

        {/* ── Three creation modes ──────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CREATE_MODES.map(({ id, icon: Icon, title, desc }) => (
            <button
              key={id}
              type="button"
              onClick={() => onModeClick(id)}
              disabled={isPending && id === "zero"}
              className="group text-left rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white p-5 transition-all hover:bg-[rgba(0,0,0,0.024)] hover:border-[rgba(0,0,0,0.16)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="inline-flex w-9 h-9 rounded-[14px] items-center justify-center bg-[rgba(0,0,0,0.05)] text-[#202020] group-hover:bg-[rgba(0,0,0,0.08)] transition-colors">
                <Icon className="w-[18px] h-[18px]" />
              </span>
              <p className="mt-4 text-[15px] font-semibold text-[#202020]">{title}</p>
              <p className="mt-2 text-[13px] font-normal leading-5 text-[rgba(0,0,0,0.62)]">{desc}</p>
            </button>
          ))}
        </div>

        {/* ── Negocios populares ────────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-[15px] font-semibold text-[#202020]">Negocios populares</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {POPULAR.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => pickPopular(p)}
                className="rounded-[14px] border border-[rgba(0,0,0,0.09)] bg-white px-4 py-2 text-[14px] font-medium text-[#202020] transition-all hover:bg-[rgba(0,0,0,0.024)] hover:border-[rgba(0,0,0,0.16)]"
              >
                {p}
              </button>
            ))}
          </div>
        </section>

        {/* ── Social proof ──────────────────────────────────────────────────── */}
        <p className="mt-12 text-[13px] font-normal text-[rgba(0,0,0,0.45)]">
          <span className="font-semibold text-[rgba(0,0,0,0.62)]">18.400</span> negocios creados
        </p>

      </div>
    </div>
  );
}
