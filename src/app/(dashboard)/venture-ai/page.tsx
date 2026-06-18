"use client";

import { useState } from "react";
import { ClipboardList, ListChecks, Plug2, Check } from "lucide-react";

// ─── Static content (visual only — no real AI / integrations yet) ───────────────

const HOW_IT_WORKS: { icon: React.ElementType; title: string; desc: string }[] = [
  {
    icon: ClipboardList,
    title: "Diagnóstico inicial",
    desc: "Akka te hace preguntas para entender en qué punto estás como emprendedor o negocio.",
  },
  {
    icon: ListChecks,
    title: "Plan paso a paso",
    desc: "Después del diagnóstico, Akka organiza tus prioridades y te da un plan claro de mejoras.",
  },
  {
    icon: Plug2,
    title: "Conexión con tus datos",
    desc: "Más adelante podrás conectar Meta, WhatsApp, ecommerce, analytics y otras fuentes para recibir recomendaciones más precisas.",
  },
];

const TOOLS = [
  "Meta Ads", "Google Analytics", "WhatsApp", "Shopify", "Stripe", "CRM",
];

const CAPABILITIES = [
  "Analizar tu negocio",
  "Detectar oportunidades",
  "Recomendar próximos pasos",
  "Revisar campañas",
  "Sugerir contenido",
  "Avisarte por WhatsApp",
  "Crear tareas semanales",
  "Responder preguntas sobre tu negocio",
];

function monogram(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function AkkaPage() {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="font-inter bg-white min-h-full">
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-16">

        {/* 1. Header */}
        <header className="mb-6">
          <h1 className="text-[28px] font-bold leading-[34px] tracking-[-1.03px] text-[#202020]">
            Akka
          </h1>
          <p className="mt-3 text-[18px] font-normal leading-7 text-[rgba(0,0,0,0.62)] max-w-[640px]">
            Tu asesor de negocio inteligente, conectado a tus datos y enfocado en ayudarte a crecer paso a paso.
          </p>
        </header>

        {/* 2. Hero / prompt box */}
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.09)] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-[16px] font-medium text-[#202020]">
            Cuéntame sobre tu negocio y te diré qué mejorar primero.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Describe tu negocio, idea o problema actual..."
            className="mt-3 w-full resize-none bg-transparent text-[15px] leading-6 text-[#202020] placeholder-[rgba(0,0,0,0.38)] outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center h-10 px-5 rounded-[14px] bg-[#202020] text-white text-[14px] font-semibold transition-opacity hover:opacity-90"
            >
              Empezar diagnóstico
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center h-10 px-5 rounded-[14px] border border-[rgba(0,0,0,0.09)] text-[#202020] text-[14px] font-medium transition-colors hover:bg-[rgba(0,0,0,0.024)] hover:border-[rgba(0,0,0,0.16)]"
            >
              Tengo un negocio activo
            </button>
          </div>
        </div>

        {/* 3. Cómo funciona */}
        <section className="mt-12">
          <h2 className="text-[18px] font-semibold text-[#202020]">Cómo funciona</h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white p-5"
              >
                <span className="inline-flex w-9 h-9 rounded-[14px] items-center justify-center bg-[rgba(0,0,0,0.05)] text-[#202020]">
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <p className="mt-4 text-[15px] font-semibold text-[#202020]">{title}</p>
                <p className="mt-2 text-[13px] font-normal leading-5 text-[rgba(0,0,0,0.62)]">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Conecta tus herramientas */}
        <section className="mt-12">
          <h2 className="text-[18px] font-semibold text-[#202020]">Conecta tus herramientas</h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOOLS.map((tool) => (
              <div
                key={tool}
                className="flex items-center gap-3 rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white p-4"
              >
                <span className="inline-flex w-9 h-9 rounded-[14px] items-center justify-center bg-[rgba(0,0,0,0.05)] text-[14px] font-semibold text-[#202020] shrink-0">
                  {monogram(tool)}
                </span>
                <span className="flex-1 min-w-0 text-[15px] font-medium text-[#202020] truncate">
                  {tool}
                </span>
                <span className="shrink-0 inline-flex items-center h-6 px-2.5 rounded-full bg-[rgba(0,0,0,0.05)] text-[12px] font-medium text-[rgba(0,0,0,0.62)]">
                  Próximamente
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Qué puede hacer Akka */}
        <section className="mt-12">
          <h2 className="text-[18px] font-semibold text-[#202020]">Qué puede hacer Akka</h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap}
                className="flex items-center gap-3 rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white px-4 py-3"
              >
                <span className="inline-flex w-6 h-6 rounded-full items-center justify-center bg-[rgba(0,0,0,0.05)] text-[#202020] shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span className="text-[15px] font-normal text-[#202020]">{cap}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
