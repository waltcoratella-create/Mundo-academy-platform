"use client";

import { useState, useRef, useTransition } from "react";
import {
  Sparkles, Link2, SquarePen, Mic, ArrowUp, Loader2,
  ArrowLeft, ArrowRight, Check,
} from "lucide-react";
import { createFirstBusiness } from "@/app/actions/business";

// ─── Static content (visual only) ──────────────────────────────────────────────

const CREATE_MODES: { id: "ai" | "url" | "zero"; icon: React.ElementType; title: string; desc: string }[] = [
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

const TIPOS = [
  "Curso", "Comunidad", "Mentoría", "Servicio", "Producto digital",
  "Newsletter", "Evento", "Marketplace", "Otro",
];

const MONETIZACION = [
  "Gratis", "Pago único", "Suscripción mensual", "Suscripción anual", "Membresía premium",
];

const TOTAL_STEPS = 6;

type Screen = "home" | "url" | "flow";

export default function CrearPage() {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Box / navigation
  const [query, setQuery]   = useState("");          // AI box text
  const [screen, setScreen] = useState<Screen>("home");
  const [step, setStep]     = useState(1);
  const [urlInput, setUrlInput] = useState("");

  // Guided-flow form data
  const [idea, setIdea]                 = useState("");
  const [tipo, setTipo]                 = useState<string | null>(null);
  const [nombre, setNombre]             = useState("");
  const [audiencia, setAudiencia]       = useState("");
  const [oferta, setOferta]             = useState("");
  const [monetizacion, setMonetizacion] = useState<string | null>(null);

  // ── Flow control ────────────────────────────────────────────────────────────

  function startFlow(initialIdea: string) {
    setIdea(initialIdea);
    setTipo(null);
    setNombre(initialIdea.trim());
    setAudiencia("");
    setOferta("");
    setMonetizacion(null);
    setStep(1);
    setScreen("flow");
  }

  function cancelFlow() {
    setScreen("home");
    setStep(1);
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
    else setScreen("home");
  }

  function next() {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  }

  // Real creation — only here, at the final step.
  function createBusiness() {
    const name = nombre.trim() || idea.trim() || "Mi negocio";
    const type = tipo ?? "course";
    startTransition(() => createFirstBusiness(name, type));
  }

  function stepValid(s: number): boolean {
    switch (s) {
      case 1: return tipo !== null;
      case 2: return nombre.trim().length > 0;
      case 3: return audiencia.trim().length > 0;
      case 4: return oferta.trim().length > 0;
      case 5: return monetizacion !== null;
      default: return true;
    }
  }

  // ── Home handlers ─────────────────────────────────────────────────────────────

  const canSend = query.trim().length > 0;

  function onBoxKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) startFlow(query.trim());
    }
  }

  function onModeClick(id: "ai" | "url" | "zero") {
    if (id === "ai") startFlow(query.trim());        // use box text if present (may be empty)
    else if (id === "url") { setScreen("url"); }
    else startFlow("");                               // from scratch, independent of the box
  }

  function pickPopular(text: string) {
    setQuery(text);
    startFlow(text);
  }

  // ─────────────────────────────────────────────────────────────────────────────

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

        {/* ════════════════════════ HOME ════════════════════════ */}
        {screen === "home" && (
          <>
            {/* AI box — opens the guided flow (does NOT create) */}
            <div className="rounded-[20px] border border-[rgba(0,0,0,0.09)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-[rgba(0,0,0,0.2)] transition-colors">
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onBoxKeyDown}
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
                  onClick={() => startFlow(query.trim())}
                  disabled={!canSend}
                  aria-label="Continuar con tu idea"
                  className="w-9 h-9 rounded-[14px] flex items-center justify-center bg-[#202020] text-white transition-opacity disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
                >
                  <ArrowUp className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>

            {/* Three creation modes */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CREATE_MODES.map(({ id, icon: Icon, title, desc }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onModeClick(id)}
                  className="group text-left rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white p-5 transition-all hover:bg-[rgba(0,0,0,0.024)] hover:border-[rgba(0,0,0,0.16)]"
                >
                  <span className="inline-flex w-9 h-9 rounded-[14px] items-center justify-center bg-[rgba(0,0,0,0.05)] text-[#202020] group-hover:bg-[rgba(0,0,0,0.08)] transition-colors">
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <p className="mt-4 text-[15px] font-semibold text-[#202020]">{title}</p>
                  <p className="mt-2 text-[13px] font-normal leading-5 text-[rgba(0,0,0,0.62)]">{desc}</p>
                </button>
              ))}
            </div>

            {/* Negocios populares */}
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

            {/* Social proof */}
            <p className="mt-12 text-[13px] font-normal text-[rgba(0,0,0,0.45)]">
              <span className="font-semibold text-[rgba(0,0,0,0.62)]">18.400</span> negocios creados
            </p>
          </>
        )}

        {/* ════════════════════════ URL ════════════════════════ */}
        {screen === "url" && (
          <div className="rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white p-6">
            <p className="text-[15px] font-semibold text-[#202020]">Crear desde URL</p>
            <p className="mt-2 text-[13px] font-normal leading-5 text-[rgba(0,0,0,0.62)]">
              Pega una URL como contexto. Continuaremos con el flujo guiado.
            </p>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Pega la URL de tu negocio, curso o comunidad..."
              className="mt-5 w-full rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white px-4 py-3 text-[15px] text-[#202020] placeholder-[rgba(0,0,0,0.38)] outline-none focus:border-[rgba(0,0,0,0.2)] transition-colors"
            />
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setScreen("home")}
                className="text-[14px] font-medium text-[rgba(0,0,0,0.62)] hover:text-[#202020] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => startFlow(urlInput.trim())}
                disabled={urlInput.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-[14px] bg-[#202020] px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
              >
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════ GUIDED FLOW ════════════════════════ */}
        {screen === "flow" && (
          <div className="rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white p-6">

            {/* Progress */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[rgba(0,0,0,0.45)]">
                Paso {step} de {TOTAL_STEPS}
              </span>
              <button
                type="button"
                onClick={cancelFlow}
                className="text-[13px] font-medium text-[rgba(0,0,0,0.45)] hover:text-[#202020] transition-colors"
              >
                Cancelar
              </button>
            </div>
            <div className="mt-3 h-1 w-full rounded-full bg-[rgba(0,0,0,0.06)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#202020] transition-all duration-300"
                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              />
            </div>

            {/* Step content */}
            <div className="mt-6 min-h-[180px]">

              {step === 1 && (
                <>
                  <h3 className="text-[18px] font-semibold text-[#202020]">¿Qué tipo de negocio quieres crear?</h3>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {TIPOS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipo(t)}
                        className={`rounded-[14px] border px-4 py-2 text-[14px] font-medium transition-all ${
                          tipo === t
                            ? "border-[#202020] bg-[rgba(0,0,0,0.05)] text-[#202020]"
                            : "border-[rgba(0,0,0,0.09)] bg-white text-[#202020] hover:bg-[rgba(0,0,0,0.024)] hover:border-[rgba(0,0,0,0.16)]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h3 className="text-[18px] font-semibold text-[#202020]">¿Cuál es el nombre de tu negocio?</h3>
                  <p className="mt-2 text-[13px] text-[rgba(0,0,0,0.62)]">Puedes editar la sugerencia.</p>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Academia de Marketing Digital"
                    className="mt-5 w-full rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white px-4 py-3 text-[15px] text-[#202020] placeholder-[rgba(0,0,0,0.38)] outline-none focus:border-[rgba(0,0,0,0.2)] transition-colors"
                  />
                </>
              )}

              {step === 3 && (
                <>
                  <h3 className="text-[18px] font-semibold text-[#202020]">¿A quién va dirigido?</h3>
                  <textarea
                    value={audiencia}
                    onChange={(e) => setAudiencia(e.target.value)}
                    rows={3}
                    placeholder="Ej. Emprendedores que empiezan en e-commerce..."
                    className="mt-5 w-full resize-none rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white px-4 py-3 text-[15px] leading-6 text-[#202020] placeholder-[rgba(0,0,0,0.38)] outline-none focus:border-[rgba(0,0,0,0.2)] transition-colors"
                  />
                </>
              )}

              {step === 4 && (
                <>
                  <h3 className="text-[18px] font-semibold text-[#202020]">¿Qué vas a vender?</h3>
                  <textarea
                    value={oferta}
                    onChange={(e) => setOferta(e.target.value)}
                    rows={3}
                    placeholder="Ej. Un curso en vídeo + comunidad + plantillas..."
                    className="mt-5 w-full resize-none rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-white px-4 py-3 text-[15px] leading-6 text-[#202020] placeholder-[rgba(0,0,0,0.38)] outline-none focus:border-[rgba(0,0,0,0.2)] transition-colors"
                  />
                </>
              )}

              {step === 5 && (
                <>
                  <h3 className="text-[18px] font-semibold text-[#202020]">¿Cómo quieres monetizarlo?</h3>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {MONETIZACION.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMonetizacion(m)}
                        className={`rounded-[14px] border px-4 py-2 text-[14px] font-medium transition-all ${
                          monetizacion === m
                            ? "border-[#202020] bg-[rgba(0,0,0,0.05)] text-[#202020]"
                            : "border-[rgba(0,0,0,0.09)] bg-white text-[#202020] hover:bg-[rgba(0,0,0,0.024)] hover:border-[rgba(0,0,0,0.16)]"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 6 && (
                <>
                  <h3 className="text-[18px] font-semibold text-[#202020]">Resumen</h3>
                  <dl className="mt-5 divide-y divide-[rgba(0,0,0,0.06)] rounded-[16px] border border-[rgba(0,0,0,0.09)] bg-[rgba(0,0,0,0.024)]">
                    {[
                      ["Idea inicial", idea.trim() || "—"],
                      ["Tipo de negocio", tipo ?? "—"],
                      ["Nombre", nombre.trim() || "—"],
                      ["Audiencia", audiencia.trim() || "—"],
                      ["Oferta", oferta.trim() || "—"],
                      ["Monetización", monetizacion ?? "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-4 px-4 py-3">
                        <dt className="w-32 shrink-0 text-[13px] font-medium text-[rgba(0,0,0,0.45)]">{k}</dt>
                        <dd className="text-[14px] text-[#202020] break-words">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}

            </div>

            {/* Footer nav */}
            <div className="mt-6 flex items-center justify-between border-t border-[rgba(0,0,0,0.06)] pt-5">
              <button
                type="button"
                onClick={back}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[rgba(0,0,0,0.62)] hover:text-[#202020] transition-colors disabled:opacity-40"
              >
                <ArrowLeft className="w-4 h-4" /> Atrás
              </button>

              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={next}
                  disabled={!stepValid(step)}
                  className="inline-flex items-center gap-2 rounded-[14px] bg-[#202020] px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={createBusiness}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-[14px] bg-[#202020] px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
                >
                  {isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creando negocio…</>
                  ) : (
                    <>Crear negocio <Check className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
