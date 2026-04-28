"use client";

import { useState } from "react";
import { GraduationCap, Users, Wrench, CreditCard, Target, FileText, Building, Cpu, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessType } from "@/types";

const BUSINESS_TYPES: { type: BusinessType; icon: React.ElementType; label: string; desc: string; price: string }[] = [
  { type: "course",          icon: GraduationCap, label: "Curso",             desc: "Contenido estructurado en módulos",           price: "Pago único / suscripción" },
  { type: "community",       icon: Users,         label: "Comunidad Privada", desc: "Foro + chat + recursos exclusivos",            price: "Membresía mensual/anual" },
  { type: "service",         icon: Wrench,        label: "Servicio",          desc: "Freelance o agencia con booking integrado",   price: "Por proyecto / retainer" },
  { type: "subscription",    icon: CreditCard,    label: "Suscripción",       desc: "Acceso a contenido o beneficios recurrentes", price: "Mensual / anual" },
  { type: "mentoring",       icon: Target,        label: "Mentoría",          desc: "Sesiones 1:1 con calendario integrado",       price: "Por sesión / paquetes" },
  { type: "digital_product", icon: FileText,      label: "Producto Digital",  desc: "Ebooks, templates, herramientas",             price: "Pago único" },
  { type: "agency",          icon: Building,      label: "Agencia",           desc: "Propuesta + clientes + entregables",          price: "Retainer + proyectos" },
  { type: "saas",            icon: Cpu,           label: "SaaS Simple",       desc: "Tool o dashboard con acceso por tier",        price: "Por tier de uso" },
];

const SUGGESTIONS = [
  "Crear curso de marketing digital",
  "Lanzar comunidad de e-commerce",
  "Vender servicio de diseño web",
  "Montar agencia de publicidad",
];

export default function CrearPage() {
  const [selected, setSelected] = useState<BusinessType | null>(null);
  const [query, setQuery] = useState("");

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Crear negocio</h1>
        <p className="text-gray-500 text-sm mt-1">
          Venture AI te ayuda a construir y lanzar en minutos
        </p>
      </div>

      {/* AI input */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-8 text-white space-y-4">
        <h2 className="text-xl font-bold">¿Qué quieres construir hoy?</h2>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="💡 Escribe tu idea o elige una opción..."
            className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
          />
          {query && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-brand-600 rounded-lg px-3 py-1 text-xs font-semibold flex items-center gap-1">
              Generar <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-xs text-gray-400 font-medium">O ELIGE UN TIPO</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* Business type grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {BUSINESS_TYPES.map(({ type, icon: Icon, label, desc, price }) => (
          <button
            key={type}
            onClick={() => setSelected(type)}
            className={`text-left p-4 rounded-xl border-2 transition-all space-y-2
              ${selected === type
                ? "border-brand-500 bg-brand-50"
                : "border-gray-100 bg-white hover:border-brand-200 hover:bg-gray-50"
              }`}
          >
            <Icon className={`w-6 h-6 ${selected === type ? "text-brand-500" : "text-gray-400"}`} />
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            <p className="text-xs text-gray-400 leading-tight">{desc}</p>
            <p className="text-xs font-medium text-brand-600">{price}</p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex justify-end">
          <Button size="lg">
            Continuar con {BUSINESS_TYPES.find((b) => b.type === selected)?.label}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
