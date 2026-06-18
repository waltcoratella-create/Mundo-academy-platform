"use client";

import { useState } from "react";
import { Search } from "lucide-react";

// ─── Mock data (visual only — not connected to real products) ───────────────────

const CATEGORIES = [
  "Todos", "Marketing", "Ventas", "Finanzas", "IA",
  "Liderazgo", "Emprendimiento", "Mundo Ejecutivo",
];

type CourseLabel = "Gratis" | "Curso" | "Premium" | "Nuevo";

interface Course {
  title: string;
  description: string;
  category: string;
  label: CourseLabel;
  gradient: string;
}

const FEATURED: Course[] = [
  {
    title: "Fundamentos de IA para negocios",
    description: "Aplica inteligencia artificial para automatizar y escalar tu operación.",
    category: "IA",
    label: "Nuevo",
    gradient: "from-violet-100 to-indigo-100",
  },
  {
    title: "Growth Marketing desde cero",
    description: "Adquiere clientes y crece de forma sostenible con experimentos medibles.",
    category: "Marketing",
    label: "Curso",
    gradient: "from-rose-100 to-orange-100",
  },
  {
    title: "Finanzas para emprendedores",
    description: "Entiende tus números, márgenes y flujo de caja sin ser experto.",
    category: "Finanzas",
    label: "Premium",
    gradient: "from-emerald-100 to-teal-100",
  },
  {
    title: "Liderazgo ejecutivo moderno",
    description: "Dirige equipos de alto rendimiento en entornos de cambio constante.",
    category: "Liderazgo",
    label: "Curso",
    gradient: "from-amber-100 to-yellow-100",
  },
  {
    title: "Ventas B2B de alto valor",
    description: "Cierra acuerdos complejos con un proceso comercial replicable.",
    category: "Ventas",
    label: "Premium",
    gradient: "from-sky-100 to-cyan-100",
  },
  {
    title: "Cómo lanzar tu primera comunidad",
    description: "Construye, activa y monetiza una comunidad desde el primer miembro.",
    category: "Emprendimiento",
    label: "Gratis",
    gradient: "from-fuchsia-100 to-pink-100",
  },
];

const EXECUTIVE: Course[] = [
  {
    title: "Estrategia empresarial en mercados emergentes",
    description: "Detecta oportunidades y compite en economías de alto crecimiento.",
    category: "Mundo Ejecutivo",
    label: "Premium",
    gradient: "from-slate-100 to-gray-200",
  },
  {
    title: "Marca personal para líderes",
    description: "Construye autoridad y reputación que impulse tu carrera y tu negocio.",
    category: "Mundo Ejecutivo",
    label: "Curso",
    gradient: "from-stone-100 to-amber-100",
  },
  {
    title: "Innovación y transformación digital",
    description: "Lleva tu organización al siguiente nivel con un plan de adopción real.",
    category: "Mundo Ejecutivo",
    label: "Nuevo",
    gradient: "from-zinc-100 to-slate-200",
  },
];

const LABEL_STYLES: Record<CourseLabel, string> = {
  Gratis:  "bg-emerald-50 text-emerald-700",
  Curso:   "bg-black/[0.05] text-[rgba(0,0,0,0.62)]",
  Premium: "bg-amber-50 text-amber-700",
  Nuevo:   "bg-violet-50 text-violet-700",
};

// ─── CourseCard ─────────────────────────────────────────────────────────────────

function CourseCard({ course }: { course: Course }) {
  return (
    <div className="group flex flex-col rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-8px_rgba(0,0,0,0.12)]">
      {/* Banner */}
      <div className={`relative aspect-[2/1] bg-gradient-to-br ${course.gradient}`}>
        <span className="absolute top-3 left-3 inline-flex items-center h-6 px-2.5 rounded-full bg-white/90 backdrop-blur-sm text-[11px] font-medium text-[#202020]">
          {course.category}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold leading-snug text-[#202020] line-clamp-2">
            {course.title}
          </h3>
          <span className={`shrink-0 inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium ${LABEL_STYLES[course.label]}`}>
            {course.label}
          </span>
        </div>
        <p className="text-[14px] font-normal leading-5 text-[rgba(0,0,0,0.62)] line-clamp-2">
          {course.description}
        </p>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function CursosPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");

  return (
    <div className="font-inter bg-white min-h-full">
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-16">

        {/* 1. Header */}
        <header className="mb-6">
          <h1 className="text-[28px] font-bold leading-[34px] tracking-[-1.03px] text-[#202020]">
            Cursos
          </h1>
          <p className="mt-3 text-[18px] font-normal leading-7 text-[rgba(0,0,0,0.62)]">
            Aprende de expertos, emprendedores y líderes de negocio.
          </p>
        </header>

        {/* 2. Search */}
        <div className="flex items-center gap-2 h-12 px-4 rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white focus-within:border-[rgba(0,0,0,0.2)] transition-colors">
          <Search className="w-5 h-5 text-[rgba(0,0,0,0.38)] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cursos, mentorías o recursos..."
            className="flex-1 bg-transparent text-[15px] text-[#202020] placeholder-[rgba(0,0,0,0.38)] outline-none min-w-0"
          />
        </div>

        {/* 3. Category chips */}
        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const active = cat === activeCategory;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`h-9 px-4 rounded-[14px] text-[14px] font-medium transition-all ${
                  active
                    ? "bg-[#202020] text-white"
                    : "border border-[rgba(0,0,0,0.09)] text-[#202020] hover:bg-[rgba(0,0,0,0.024)] hover:border-[rgba(0,0,0,0.16)]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* 4. Cursos destacados */}
        <section className="mt-12">
          <h2 className="text-[18px] font-semibold text-[#202020]">Cursos destacados</h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURED.map((c) => (
              <CourseCard key={c.title} course={c} />
            ))}
          </div>
        </section>

        {/* 5. Mundo Ejecutivo recomienda */}
        <section className="mt-12">
          <h2 className="text-[18px] font-semibold text-[#202020]">Mundo Ejecutivo recomienda</h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXECUTIVE.map((c) => (
              <CourseCard key={c.title} course={c} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
