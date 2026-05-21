"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Link2, Plus, Copy, ExternalLink, Power, CheckCircle2,
  AlertCircle, Loader2, X,
} from "lucide-react";
import { createPaymentLink, togglePaymentLink } from "@/app/actions/payment-links";
import type { PaymentLink } from "@/lib/supabase/queries";
import type { Product } from "@/lib/supabase/queries";

const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS payment_links (
  id           uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id  uuid         NOT NULL,
  product_id   uuid         NOT NULL,
  title        text         NOT NULL,
  slug         text         UNIQUE NOT NULL,
  active       boolean      DEFAULT true NOT NULL,
  created_at   timestamptz  DEFAULT now() NOT NULL
);`;

interface Props {
  businessId: string;
  businessName: string;
  links: PaymentLink[];
  products: Product[];
  tableExists: boolean;
  showCreated: boolean;
  appUrl: string;
}

export function PaymentLinksClient({
  businessId,
  businessName,
  links,
  products,
  tableExists,
  showCreated,
  appUrl,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);

  const activeCount = links.filter((l) => l.active).length;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enlaces de pago</h1>
          <p className="text-gray-500 text-sm mt-1">{businessName} · Links compartibles de checkout</p>
        </div>
        {tableExists && (
          <button
            onClick={() => setCreateOpen((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              createOpen
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-brand-500 hover:bg-brand-600 text-white"
            }`}
          >
            {createOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {createOpen ? "Cancelar" : "Crear enlace"}
          </button>
        )}
      </div>

      {/* Success banner */}
      {showCreated && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Enlace creado correctamente.
        </div>
      )}

      {/* Migration notice */}
      {!tableExists && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-yellow-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Tabla payment_links no encontrada
          </div>
          <p className="text-xs text-yellow-700 leading-relaxed">
            Ejecuta este SQL en tu panel de Supabase para habilitar los enlaces de pago:
          </p>
          <pre className="text-xs bg-white border border-yellow-200 rounded-lg p-3 overflow-x-auto text-gray-700 font-mono leading-relaxed">
            {MIGRATION_SQL}
          </pre>
        </div>
      )}

      {/* KPI cards */}
      {tableExists && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard label="Total enlaces"  value={String(links.length)} sub="creados" />
          <KpiCard label="Activos"        value={String(activeCount)}  sub="en funcionamiento" accent />
          <KpiCard label="Clicks"         value="—"                    sub="próximamente" />
          <KpiCard label="Conversión"     value="—"                    sub="próximamente" />
        </div>
      )}

      {/* Create form */}
      {createOpen && tableExists && (
        <CreateForm
          businessId={businessId}
          products={products}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {/* Links table / empty state */}
      {tableExists && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {links.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Link2 className="w-7 h-7 text-gray-300" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700">Sin enlaces de pago todavía</p>
                <p className="text-xs text-gray-400">
                  Crea tu primer enlace para compartir el checkout de cualquier producto.
                </p>
              </div>
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear enlace
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50">
                  <tr>
                    {["Título / Producto", "URL", "Estado", "Fecha", "Acciones"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {links.map((link) => (
                    <LinkRow
                      key={link.id}
                      link={link}
                      businessId={businessId}
                      appUrl={appUrl}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, accent = false,
}: {
  label: string; value: string; sub: string; accent?: boolean;
}) {
  return (
    <div className="kpi-card">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ? "text-brand-600" : "text-gray-900"}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

// ── Link table row ────────────────────────────────────────────────────────────

function LinkRow({
  link, businessId, appUrl,
}: {
  link: PaymentLink; businessId: string; appUrl: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);
  const fullUrl = `${appUrl}/pay/${link.slug}`;

  const date = new Date(link.created_at).toLocaleDateString("es-MX", {
    day: "numeric", month: "short", year: "numeric",
  });

  async function handleCopy() {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleToggle() {
    setToggling(true);
    await togglePaymentLink(link.id, businessId);
    router.refresh();
    setToggling(false);
  }

  return (
    <tr className="hover:bg-gray-50 group">
      {/* Title / product */}
      <td className="px-5 py-3.5">
        <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{link.title}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{link.product_name}</p>
      </td>

      {/* URL */}
      <td className="px-5 py-3.5">
        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
          /pay/{link.slug}
        </span>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            link.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${link.active ? "bg-green-500" : "bg-gray-400"}`} />
          {link.active ? "Activo" : "Inactivo"}
        </span>
      </td>

      {/* Date */}
      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{date}</td>

      {/* Actions */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1">
          {/* Copy */}
          <ActionBtn
            title={copied ? "¡Copiado!" : "Copiar URL"}
            onClick={handleCopy}
          >
            {copied ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </ActionBtn>

          {/* Open */}
          <ActionBtn title="Abrir enlace" onClick={() => window.open(fullUrl, "_blank")}>
            <ExternalLink className="w-3.5 h-3.5" />
          </ActionBtn>

          {/* Toggle active */}
          <ActionBtn
            title={link.active ? "Desactivar" : "Activar"}
            onClick={handleToggle}
            danger={link.active}
          >
            {toggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Power className="w-3.5 h-3.5" />
            )}
          </ActionBtn>
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({
  title, onClick, danger = false, children,
}: {
  title: string; onClick: () => void; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${
        danger
          ? "text-gray-300 hover:bg-red-50 hover:text-red-500"
          : "text-gray-300 hover:bg-gray-100 hover:text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

// ── Create form ───────────────────────────────────────────────────────────────

function CreateForm({
  businessId,
  products,
  onClose,
}: {
  businessId: string;
  products: Product[];
  onClose: () => void;
}) {
  const boundAction = createPaymentLink.bind(null, businessId);
  const [state, formAction] = useFormState(boundAction, { error: "" });
  const [slug, setSlug] = useState("");

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .slice(0, 60);
    setSlug(raw);
  }

  return (
    <div className="bg-white rounded-xl border border-brand-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Nuevo enlace de pago</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5">
        {state.error && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 mb-4">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          {/* Product */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Producto <span className="text-red-400">*</span>
            </label>
            <select
              name="product_id"
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">Selecciona un producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="Ej. Oferta de lanzamiento"
              onChange={handleTitleChange}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Slug <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
              <span className="px-3 py-2.5 bg-gray-50 text-xs text-gray-400 border-r border-gray-200 shrink-0 font-mono">
                /pay/
              </span>
              <input
                type="text"
                name="slug"
                required
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "")
                      .replace(/-+/g, "-")
                  )
                }
                placeholder="mi-enlace"
                className="flex-1 px-3 py-2.5 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none font-mono"
              />
            </div>
            <p className="text-xs text-gray-400">Solo letras minúsculas, números y guiones.</p>
          </div>

          <div className="flex justify-end pt-1">
            <CreateSubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
    >
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      {pending ? "Creando…" : "Crear enlace"}
    </button>
  );
}
