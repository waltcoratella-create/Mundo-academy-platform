"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  Bell, CreditCard, Palette, Shield, FileText, Scale,
  BarChart2, Home, AppWindow, ChevronRight, Pencil,
  CheckCircle2, AlertCircle, Loader2, X,
} from "lucide-react";
import { updateBusinessSettings } from "@/app/actions/business-settings";
import type { BusinessSettings } from "@/lib/supabase/queries";

const MIGRATION_SQL = `ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS description   text,
  ADD COLUMN IF NOT EXISTS website       text,
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS logo_url      text,
  ADD COLUMN IF NOT EXISTS cover_url     text;`;

interface Props {
  settings: BusinessSettings;
  showSuccess: boolean;
}

export function SettingsCenter({ settings, showSuccess }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">

      {showSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Cambios guardados correctamente.
        </div>
      )}

      {/* ── Negocios ── */}
      <SettingsSection title="Negocios">
        <BusinessCard
          settings={settings}
          editOpen={editOpen}
          onToggleEdit={() => setEditOpen((v) => !v)}
        />
      </SettingsSection>

      {editOpen && (
        <EditForm settings={settings} onClose={() => setEditOpen(false)} />
      )}

      {/* ── Configuraciones ── */}
      <SettingsSection title="Configuraciones">
        <SettingsRow icon={Bell}       title="Notificaciones"           subtitle="Todas las notificaciones habilitadas"            active />
        <SettingsRow icon={CreditCard} title="Pagar"                    subtitle="Correos electrónicos transaccionales habilitados" active />
        <SettingsRow icon={Palette}    title="Marca de pago"            subtitle="Personalizar la apariencia del pago" />
        <SettingsRow icon={Shield}     title="Pagos"                    subtitle="1 protección de pago habilitada"                 active />
        <SettingsRow icon={FileText}   title="Facturas"                 subtitle="No se ha establecido un prefijo personalizado" />
        <SettingsRow icon={Scale}      title="Legal"                    subtitle="No se han subido documentos de póliza" />
        <SettingsRow icon={BarChart2}  title="Abrir imagen del gráfico" subtitle="La imagen del gráfico es accesible"              active />
        <SettingsRow icon={Home}       title="Preferencias de inicio"   subtitle="Personaliza tu página de inicio pública" />
        <SettingsRow icon={AppWindow}  title="Aplicaciones autorizadas" subtitle="Todas las aplicaciones autorizadas"              active />
      </SettingsSection>

      {/* ── Analíticas ── */}
      <SettingsSection title="Analíticas">
        <AnalyticsRow name="Google Analytics" abbr="GA" bg="bg-orange-100"  fg="text-orange-600" />
        <AnalyticsRow name="Hyros"            abbr="H"  bg="bg-purple-100"  fg="text-purple-600" />
        <AnalyticsRow name="Meta"             abbr="M"  bg="bg-blue-100"    fg="text-blue-600" />
        <AnalyticsRow name="TikTok"           abbr="TT" bg="bg-gray-900"    fg="text-white" />
        <AnalyticsRow name="X"                abbr="X"  bg="bg-gray-900"    fg="text-white" />
        <AnalyticsRow name="Reddit"           abbr="R"  bg="bg-orange-100"  fg="text-orange-700" />
        <AnalyticsRow name="Pinterest"        abbr="P"  bg="bg-red-100"     fg="text-red-600" />
        <AnalyticsRow name="Hubspot"          abbr="HS" bg="bg-orange-50"   fg="text-orange-500" />
      </SettingsSection>

      {/* ── Zona de peligro ── */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Zona de peligro</h2>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Eliminar negocio</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Esto eliminará permanentemente todos los pagos, productos y clientes.
            </p>
          </div>
          <button
            onClick={() => alert("Eliminar negocio — Próximamente disponible")}
            className="shrink-0 text-sm font-medium text-red-500 hover:text-red-600 transition-colors whitespace-nowrap"
          >
            Eliminar negocio
          </button>
        </div>
      </div>

    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {children}
      </div>
    </div>
  );
}

// ── Business card ────────────────────────────────────────────────────────────

function BusinessCard({
  settings,
  editOpen,
  onToggleEdit,
}: {
  settings: BusinessSettings;
  editOpen: boolean;
  onToggleEdit: () => void;
}) {
  const initial = settings.name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {/* Avatar */}
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-brand-500 flex items-center justify-center">
        {settings.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logo_url} alt={settings.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-bold text-white">{initial}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{settings.name}</p>
        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
          {settings.description ?? "Sin descripción — haz clic en Editar para añadir una."}
        </p>
      </div>

      {/* Edit toggle */}
      <button
        onClick={onToggleEdit}
        className={`inline-flex items-center gap-1.5 px-4 py-2 border rounded-lg text-sm font-medium transition-colors shrink-0 ${
          editOpen
            ? "border-brand-200 bg-brand-50 text-brand-600"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Pencil className="w-3.5 h-3.5" />
        {editOpen ? "Cerrar" : "Editar"}
      </button>
    </div>
  );
}

// ── Settings row ─────────────────────────────────────────────────────────────

function SettingsRow({
  icon: Icon,
  title,
  subtitle,
  active,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  active?: boolean;
}) {
  return (
    <button className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left group">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {active !== undefined && (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-green-500" : "bg-gray-300"}`}
            />
          )}
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0 transition-colors" />
    </button>
  );
}

// ── Analytics row ────────────────────────────────────────────────────────────

function AnalyticsRow({
  name,
  abbr,
  bg,
  fg,
}: {
  name: string;
  abbr: string;
  bg: string;
  fg: string;
}) {
  return (
    <button className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left group">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <span className={`text-xs font-bold ${fg}`}>{abbr}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
          <p className="text-xs text-gray-500">El píxel está inactivo</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0 transition-colors" />
    </button>
  );
}

// ── Inline edit form ─────────────────────────────────────────────────────────

function EditForm({
  settings,
  onClose,
}: {
  settings: BusinessSettings;
  onClose: () => void;
}) {
  const boundAction = updateBusinessSettings.bind(null, settings.id);
  const [state, formAction] = useFormState(boundAction, { error: "" });

  return (
    <div className="rounded-xl border border-brand-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Editar información del negocio</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar formulario"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Migration notice */}
        {!settings.hasExtendedFields && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-2">
            <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Columnas opcionales no encontradas
            </p>
            <p className="text-xs text-yellow-700 leading-relaxed">
              Para habilitar descripción, website e imágenes, ejecuta este SQL en Supabase:
            </p>
            <pre className="text-xs bg-white border border-yellow-200 rounded p-2.5 overflow-x-auto text-gray-700 font-mono leading-relaxed">
              {MIGRATION_SQL}
            </pre>
            <p className="text-xs text-yellow-600">Mientras tanto, solo puedes editar el nombre.</p>
          </div>
        )}

        {/* Error */}
        {state.error && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <FormField
            label="Nombre del negocio"
            name="name"
            defaultValue={settings.name}
            placeholder="Mi negocio"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Sitio web"
              name="website"
              defaultValue={settings.website ?? ""}
              placeholder="https://tunegocio.com"
              type="url"
              disabled={!settings.hasExtendedFields}
            />
            <FormField
              label="Email de soporte"
              name="support_email"
              defaultValue={settings.support_email ?? ""}
              placeholder="soporte@tunegocio.com"
              type="email"
              disabled={!settings.hasExtendedFields}
            />
          </div>

          <FormField
            label="Descripción"
            name="description"
            defaultValue={settings.description ?? ""}
            placeholder="Describe tu negocio en pocas palabras…"
            multiline
            disabled={!settings.hasExtendedFields}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="URL del logo"
              name="logo_url"
              defaultValue={settings.logo_url ?? ""}
              placeholder="https://…/logo.png"
              type="url"
              hint="Cuadrado, mín. 128×128 px"
              disabled={!settings.hasExtendedFields}
            />
            <FormField
              label="URL de portada"
              name="cover_url"
              defaultValue={settings.cover_url ?? ""}
              placeholder="https://…/cover.jpg"
              type="url"
              hint="Horizontal, recomendado 1200×400 px"
              disabled={!settings.hasExtendedFields}
            />
          </div>

          <div className="flex justify-end pt-1">
            <EditSubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Form field ───────────────────────────────────────────────────────────────

function FormField({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  type = "text",
  multiline,
  hint,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  multiline?: boolean;
  hint?: string;
  disabled?: boolean;
}) {
  const base =
    "w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed";

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
        {disabled && (
          <span className="ml-2 text-xs font-normal text-yellow-600">(requiere migración SQL)</span>
        )}
      </label>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={3}
          disabled={disabled}
          className={`${base} resize-none`}
        />
      ) : (
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={base}
        />
      )}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function EditSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
    >
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      {pending ? "Guardando…" : "Guardar cambios"}
    </button>
  );
}
