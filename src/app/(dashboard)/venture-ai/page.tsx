"use client";

import { useState, useEffect } from "react";
import { ClipboardList, ListChecks, Plug2, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { AkkaCore } from "./akka-core";

// ─── Static content (visual only — no real AI / integrations yet) ───────────────

const HOW_IT_WORKS: { icon: React.ElementType; title: string; desc: string }[] = [
  { icon: ClipboardList, title: "Diagnóstico inicial", desc: "Akka te hace preguntas para entender en qué punto estás como emprendedor o negocio." },
  { icon: ListChecks,    title: "Plan paso a paso",    desc: "Después del diagnóstico, Akka organiza tus prioridades y te da un plan claro de mejoras." },
  { icon: Plug2,         title: "Conexión con tus datos", desc: "Más adelante podrás conectar Meta, WhatsApp, ecommerce, analytics y otras fuentes para recibir recomendaciones más precisas." },
];

const TOOLS = ["Meta Ads", "Google Analytics", "WhatsApp", "Shopify", "Stripe", "CRM"];

const CAPABILITIES = [
  "Analizar tu negocio", "Detectar oportunidades", "Recomendar próximos pasos",
  "Revisar campañas", "Sugerir contenido", "Avisarte por WhatsApp",
  "Crear tareas semanales", "Responder preguntas sobre tu negocio",
];

const ANALYZING_MESSAGES = [
  "Entendiendo tu negocio...",
  "Detectando oportunidades...",
  "Priorizando próximos pasos...",
  "Preparando diagnóstico...",
];

function monogram(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

// ─── Diagnostic model ───────────────────────────────────────────────────────────

interface Answers {
  punto: string | null;
  tipo: string | null;
  problema: string | null;
  facturacion: string | null;
  canales: string[];
  objetivo: string;
}

const EMPTY: Answers = {
  punto: null, tipo: null, problema: null, facturacion: null, canales: [], objetivo: "",
};

type Question =
  | { key: "punto" | "tipo" | "problema" | "facturacion"; type: "single"; title: string; options: string[] }
  | { key: "canales"; type: "multi"; title: string; options: string[] }
  | { key: "objetivo"; type: "text"; title: string; placeholder: string };

const QUESTIONS: Question[] = [
  { key: "punto", type: "single", title: "¿En qué punto estás?", options: ["Tengo solo una idea", "Estoy validando", "Ya vendo", "Quiero escalar"] },
  { key: "tipo", type: "single", title: "¿Qué tipo de negocio tienes o quieres crear?", options: ["Curso", "Comunidad", "Servicio", "Ecommerce", "SaaS", "Agencia", "Newsletter", "Otro"] },
  { key: "problema", type: "single", title: "¿Cuál es tu mayor problema ahora?", options: ["Conseguir clientes", "Convertir mejor", "Retener clientes", "Crear contenido", "Automatizar procesos", "Entender mis números", "Escalar el equipo", "Otro"] },
  { key: "facturacion", type: "single", title: "¿Cuánto facturas actualmente al mes?", options: ["0", "Menos de 1.000", "1.000 – 10.000", "10.000 – 50.000", "Más de 50.000"] },
  { key: "canales", type: "multi", title: "¿Qué canales usas hoy?", options: ["Instagram", "TikTok", "Meta Ads", "Google Ads", "Web", "WhatsApp", "Email", "Ninguno todavía"] },
  { key: "objetivo", type: "text", title: "¿Cuál es tu objetivo principal en los próximos 90 días?", placeholder: "Escribe tu objetivo principal..." },
];

const TOTAL = QUESTIONS.length;
const SUMMARY_ROWS: { key: keyof Answers; label: string }[] = [
  { key: "punto", label: "Punto actual" },
  { key: "tipo", label: "Tipo de negocio" },
  { key: "problema", label: "Mayor problema" },
  { key: "facturacion", label: "Facturación mensual" },
  { key: "canales", label: "Canales" },
  { key: "objetivo", label: "Objetivo 90 días" },
];

type View = "home" | "wizard" | "summary" | "analyzing";

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function AkkaPage() {
  const [view, setView] = useState<View>("home");
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [msgIndex, setMsgIndex] = useState(0);

  // Rotating messages on the analyzing screen
  useEffect(() => {
    if (view !== "analyzing") return;
    setMsgIndex(0);
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % ANALYZING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(id);
  }, [view]);

  function startWizard(prefillPunto?: string) {
    setAnswers({ ...EMPTY, punto: prefillPunto ?? null });
    setStep(1);
    setView("wizard");
  }

  function cancel() {
    setAnswers(EMPTY);
    setStep(1);
    setView("home");
  }

  function back() {
    if (view === "summary") { setView("wizard"); return; }
    if (step > 1) setStep((s) => s - 1);
    else setView("home");
  }

  function next() {
    if (step < TOTAL) setStep((s) => s + 1);
    else setView("summary");
  }

  function stepValid(): boolean {
    const q = QUESTIONS[step - 1]!;
    if (q.type === "multi") return answers.canales.length > 0;
    if (q.type === "text") return answers.objetivo.trim().length > 0;
    return answers[q.key] !== null;
  }

  function setSingle(key: "punto" | "tipo" | "problema" | "facturacion", v: string) {
    setAnswers((a) => ({ ...a, [key]: v }));
  }
  function toggleCanal(v: string) {
    setAnswers((a) => ({
      ...a,
      canales: a.canales.includes(v) ? a.canales.filter((c) => c !== v) : [...a.canales, v],
    }));
  }

  // ── ANALYZING ──────────────────────────────────────────────────────────────
  if (view === "analyzing") {
    return (
      <div className="font-inter bg-white min-h-full">
        <div className="max-w-3xl mx-auto px-6 min-h-[70vh] flex flex-col items-center justify-center text-center">
          <AkkaCore size={120} intense />
          <p className="mt-8 text-[18px] font-medium text-[#202020]">Analizando tu negocio</p>
          <p className="mt-2 text-[15px] font-normal text-[rgba(0,0,0,0.62)] transition-opacity duration-300">
            {ANALYZING_MESSAGES[msgIndex]}
          </p>
          <button
            type="button"
            onClick={cancel}
            className="mt-10 text-[14px] font-medium text-[rgba(0,0,0,0.45)] hover:text-[#202020] transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // ── WIZARD / SUMMARY ────────────────────────────────────────────────────────
  if (view === "wizard" || view === "summary") {
    const q = QUESTIONS[step - 1]!;
    return (
      <div className="font-inter bg-white min-h-full">
        <div className="max-w-2xl mx-auto px-6 pt-12 pb-16">
          <div className="flex flex-col items-center mb-8">
            <AkkaCore size={56} />
          </div>

          <div className="rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white p-6">
            {/* Progress */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[rgba(0,0,0,0.45)]">
                {view === "summary" ? "Resumen" : `Paso ${step} de ${TOTAL}`}
              </span>
              <button
                type="button"
                onClick={cancel}
                className="text-[13px] font-medium text-[rgba(0,0,0,0.45)] hover:text-[#202020] transition-colors"
              >
                Cancelar
              </button>
            </div>
            <div className="mt-3 h-1 w-full rounded-full bg-[rgba(0,0,0,0.06)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#202020] transition-all duration-300"
                style={{ width: `${(view === "summary" ? TOTAL : step) / TOTAL * 100}%` }}
              />
            </div>

            {/* Body */}
            <div className="mt-6 min-h-[200px]">
              {view === "summary" ? (
                <>
                  <h3 className="text-[18px] font-semibold text-[#202020]">Revisa tus respuestas</h3>
                  <dl className="mt-5 divide-y divide-[rgba(0,0,0,0.06)] rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-[rgba(0,0,0,0.024)]">
                    {SUMMARY_ROWS.map(({ key, label }) => {
                      const v = answers[key];
                      const text = Array.isArray(v) ? (v.length ? v.join(", ") : "—") : (v && String(v).trim()) || "—";
                      return (
                        <div key={key} className="flex gap-4 px-4 py-3">
                          <dt className="w-40 shrink-0 text-[13px] font-medium text-[rgba(0,0,0,0.45)]">{label}</dt>
                          <dd className="text-[14px] text-[#202020] break-words">{text}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </>
              ) : (
                <>
                  <h3 className="text-[18px] font-semibold text-[#202020]">{q.title}</h3>

                  {q.type === "single" && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {q.options.map((opt) => {
                        const active = answers[q.key] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setSingle(q.key, opt)}
                            className={`rounded-[14px] border px-4 py-2 text-[14px] font-medium transition-all ${
                              active
                                ? "border-[#202020] bg-[rgba(0,0,0,0.05)] text-[#202020]"
                                : "border-[rgba(0,0,0,0.09)] text-[#202020] hover:bg-[rgba(0,0,0,0.024)] hover:border-[rgba(0,0,0,0.16)]"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "multi" && (
                    <>
                      <p className="mt-2 text-[13px] text-[rgba(0,0,0,0.62)]">Puedes elegir varias.</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {q.options.map((opt) => {
                          const active = answers.canales.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => toggleCanal(opt)}
                              className={`inline-flex items-center gap-1.5 rounded-[14px] border px-4 py-2 text-[14px] font-medium transition-all ${
                                active
                                  ? "border-[#202020] bg-[rgba(0,0,0,0.05)] text-[#202020]"
                                  : "border-[rgba(0,0,0,0.09)] text-[#202020] hover:bg-[rgba(0,0,0,0.024)] hover:border-[rgba(0,0,0,0.16)]"
                              }`}
                            >
                              {active && <Check className="w-3.5 h-3.5" />}
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {q.type === "text" && (
                    <textarea
                      value={answers.objetivo}
                      onChange={(e) => setAnswers((a) => ({ ...a, objetivo: e.target.value }))}
                      rows={4}
                      placeholder={q.placeholder}
                      className="mt-5 w-full resize-none rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white px-4 py-3 text-[15px] leading-6 text-[#202020] placeholder-[rgba(0,0,0,0.38)] outline-none focus:border-[rgba(0,0,0,0.2)] transition-colors"
                    />
                  )}
                </>
              )}
            </div>

            {/* Footer nav */}
            <div className="mt-6 flex items-center justify-between border-t border-[rgba(0,0,0,0.06)] pt-5">
              <button
                type="button"
                onClick={back}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[rgba(0,0,0,0.62)] hover:text-[#202020] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Atrás
              </button>

              {view === "summary" ? (
                <button
                  type="button"
                  onClick={() => setView("analyzing")}
                  className="inline-flex items-center gap-2 rounded-[14px] bg-[#202020] px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Analizar negocio
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  disabled={!stepValid()}
                  className="inline-flex items-center gap-2 rounded-[14px] bg-[#202020] px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── HOME ────────────────────────────────────────────────────────────────────
  return (
    <div className="font-inter bg-white min-h-full">
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-16">

        {/* Akka Core + Header */}
        <header className="mb-6 flex flex-col items-center text-center">
          <AkkaCore size={96} />
          <h1 className="mt-6 text-[28px] font-bold leading-[34px] tracking-[-1.03px] text-[#202020]">
            Akka
          </h1>
          <p className="mt-3 text-[18px] font-normal leading-7 text-[rgba(0,0,0,0.62)] max-w-[640px]">
            Tu asesor de negocio inteligente, conectado a tus datos y enfocado en ayudarte a crecer paso a paso.
          </p>
        </header>

        {/* Hero / prompt box */}
        <div className="rounded-[20px] border border-[rgba(0,0,0,0.09)] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-[16px] font-medium text-[#202020]">
            Cuéntame sobre tu negocio y te diré qué mejorar primero.
          </p>
          <textarea
            rows={3}
            placeholder="Describe tu negocio, idea o problema actual..."
            className="mt-3 w-full resize-none bg-transparent text-[15px] leading-6 text-[#202020] placeholder-[rgba(0,0,0,0.38)] outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => startWizard()}
              className="inline-flex items-center justify-center h-10 px-5 rounded-[14px] bg-[#202020] text-white text-[14px] font-semibold transition-opacity hover:opacity-90"
            >
              Empezar diagnóstico
            </button>
            <button
              type="button"
              onClick={() => startWizard("Ya vendo")}
              className="inline-flex items-center justify-center h-10 px-5 rounded-[14px] border border-[rgba(0,0,0,0.09)] text-[#202020] text-[14px] font-medium transition-colors hover:bg-[rgba(0,0,0,0.024)] hover:border-[rgba(0,0,0,0.16)]"
            >
              Tengo un negocio activo
            </button>
          </div>
        </div>

        {/* Cómo funciona */}
        <section className="mt-12">
          <h2 className="text-[18px] font-semibold text-[#202020]">Cómo funciona</h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white p-5">
                <span className="inline-flex w-9 h-9 rounded-[14px] items-center justify-center bg-[rgba(0,0,0,0.05)] text-[#202020]">
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <p className="mt-4 text-[15px] font-semibold text-[#202020]">{title}</p>
                <p className="mt-2 text-[13px] font-normal leading-5 text-[rgba(0,0,0,0.62)]">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Conecta tus herramientas */}
        <section className="mt-12">
          <h2 className="text-[18px] font-semibold text-[#202020]">Conecta tus herramientas</h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOOLS.map((tool) => (
              <div key={tool} className="flex items-center gap-3 rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white p-4">
                <span className="inline-flex w-9 h-9 rounded-[14px] items-center justify-center bg-[rgba(0,0,0,0.05)] text-[14px] font-semibold text-[#202020] shrink-0">
                  {monogram(tool)}
                </span>
                <span className="flex-1 min-w-0 text-[15px] font-medium text-[#202020] truncate">{tool}</span>
                <span className="shrink-0 inline-flex items-center h-6 px-2.5 rounded-full bg-[rgba(0,0,0,0.05)] text-[12px] font-medium text-[rgba(0,0,0,0.62)]">
                  Próximamente
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Qué puede hacer Akka */}
        <section className="mt-12">
          <h2 className="text-[18px] font-semibold text-[#202020]">Qué puede hacer Akka</h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CAPABILITIES.map((cap) => (
              <div key={cap} className="flex items-center gap-3 rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white px-4 py-3">
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
