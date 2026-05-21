"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { updateBusinessSettings } from "@/app/actions/business-settings";
import type { BusinessSettings } from "@/lib/supabase/queries";

interface Props {
  settings: BusinessSettings;
  showSuccess: boolean;
}

const MIGRATION_SQL = `-- Run this in your Supabase SQL editor
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS description   text,
  ADD COLUMN IF NOT EXISTS website       text,
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS logo_url      text,
  ADD COLUMN IF NOT EXISTS cover_url     text;`;

export function SettingsForm({ settings, showSuccess }: Props) {
  const boundAction = updateBusinessSettings.bind(null, settings.id);
  const [state, formAction] = useFormState(boundAction, { error: "" });

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuraciones</h1>
        <p className="text-gray-500 text-sm mt-1">{settings.name} · Información del negocio</p>
      </div>

      {/* Success banner */}
      {showSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Cambios guardados correctamente.
        </div>
      )}

      {/* Migration notice */}
      {!settings.hasExtendedFields && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-yellow-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Columnas opcionales no encontradas
          </div>
          <p className="text-xs text-yellow-700 leading-relaxed">
            Los campos descripción, website, email de soporte e imágenes requieren columnas adicionales
            en la tabla <code className="font-mono bg-yellow-100 px-1 rounded">businesses</code>.
            Ejecuta este SQL en tu panel de Supabase para habilitarlos:
          </p>
          <pre className="text-xs bg-white border border-yellow-200 rounded-lg p-3 overflow-x-auto text-gray-700 font-mono leading-relaxed">
            {MIGRATION_SQL}
          </pre>
          <p className="text-xs text-yellow-600">
            Mientras tanto, solo puedes editar el nombre del negocio.
          </p>
        </div>
      )}

      {/* Form */}
      <form action={formAction} className="space-y-6">
        {/* Error */}
        {state.error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {state.error}
          </div>
        )}

        {/* Basic info section */}
        <Section title="Información básica">
          <Field
            label="Nombre del negocio"
            name="name"
            defaultValue={settings.name}
            required
            placeholder="Mi negocio"
          />
          <Field
            label="Descripción"
            name="description"
            defaultValue={settings.description ?? ""}
            placeholder="Describe tu negocio en pocas palabras…"
            multiline
            disabled={!settings.hasExtendedFields}
          />
        </Section>

        {/* Contact section */}
        <Section title="Contacto y web">
          <Field
            label="Sitio web"
            name="website"
            defaultValue={settings.website ?? ""}
            placeholder="https://tunegocio.com"
            type="url"
            disabled={!settings.hasExtendedFields}
          />
          <Field
            label="Email de soporte"
            name="support_email"
            defaultValue={settings.support_email ?? ""}
            placeholder="soporte@tunegocio.com"
            type="email"
            disabled={!settings.hasExtendedFields}
          />
        </Section>

        {/* Images section */}
        <Section title="Imágenes">
          <Field
            label="URL del logo"
            name="logo_url"
            defaultValue={settings.logo_url ?? ""}
            placeholder="https://…/logo.png"
            type="url"
            hint="Imagen cuadrada recomendada, mínimo 128×128 px"
            disabled={!settings.hasExtendedFields}
          />
          <Field
            label="URL de portada"
            name="cover_url"
            defaultValue={settings.cover_url ?? ""}
            placeholder="https://…/cover.jpg"
            type="url"
            hint="Imagen horizontal recomendada, 1200×400 px"
            disabled={!settings.hasExtendedFields}
          />
        </Section>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </div>
  );
}

function Field({
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
          <span className="ml-2 text-xs font-normal text-yellow-600">
            (requiere migración SQL)
          </span>
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

function SubmitButton() {
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
