"use client";

import { X, History, Maximize2, Plus, Mic, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "Pronostica los próximos 30 días de ingresos para mi negocio",
  "Promocionar mi negocio",
  "Crear una página de aterrizaje",
  "Enviar un DM a alguien",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AIAssistantPanel({ open, onClose }: Props) {
  return (
    <aside
      className={`shrink-0 h-full bg-white border-l border-gray-100 flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
        open ? "w-80" : "w-0"
      }`}
    >
      {open && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">Nueva conversación</h2>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <History className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Cerrar panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hero gradient */}
          <div className="h-36 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-400 flex items-center justify-center shadow-lg shadow-purple-200">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Suggestions */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Sugerencias
            </p>
            {SUGGESTIONS.map((text) => (
              <button
                key={text}
                className="w-full text-left px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs text-gray-700 transition-colors border border-gray-100 leading-snug"
              >
                {text}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <button className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </button>
              <input
                type="text"
                placeholder="Escribe lo que quieres que se haga"
                className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none min-w-0"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-gray-400 font-medium">231 mil</span>
                <button className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
