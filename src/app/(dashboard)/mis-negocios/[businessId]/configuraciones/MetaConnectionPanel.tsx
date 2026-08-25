"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Link2, Loader2, RefreshCw, Unlink } from "lucide-react";
import type { MetaConnection, MetaAssets } from "@/lib/meta/connection-types";
import { connectionReadiness, daysUntilExpiry } from "@/lib/meta/connection-types";
import { loadMetaAssets, saveMetaSelection, disconnectMeta } from "./meta-actions";

/**
 * Meta Ads connection panel.
 *
 * Five states: not connected, choosing assets, connected, expired, error.
 * No token ever reaches this component — it only receives the safe fields of
 * MetaConnection, whose type has no token field to begin with.
 */

const ERROR_COPY: Record<string, string> = {
  state: "La conexión no se pudo verificar. Vuelve a intentarlo.",
  session: "Tu sesión cambió durante la conexión. Inténtalo de nuevo.",
  forbidden: "No tienes permiso sobre este negocio.",
  denied: "Cancelaste la autorización en Meta.",
  oauth: "Meta rechazó la autorización.",
  exchange: "No se pudo completar el intercambio con Meta.",
  save: "No se pudo guardar la conexión.",
  config: "La integración con Meta no está configurada.",
};

export function MetaConnectionPanel({
  businessId,
  connection,
  flashError,
  justConnected,
}: {
  businessId: string;
  connection: MetaConnection | null;
  flashError?: string;
  justConnected?: boolean;
}) {
  const [assets, setAssets] = useState<MetaAssets | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [error, setError] = useState<string | null>(
    flashError ? ERROR_COPY[flashError] ?? "No se pudo conectar con Meta." : null
  );
  const [pending, startTransition] = useTransition();

  const readiness = connectionReadiness(connection);
  const isLive = connection?.status === "connected";
  const needsSelection = isLive && !readiness.ready;
  // Show the picker right after OAuth, or whenever a required asset is missing.
  const [picking, setPicking] = useState(Boolean(justConnected) || needsSelection);

  const [adAccountId, setAdAccountId] = useState(connection?.adAccountId ?? "");
  const [pageId, setPageId] = useState(connection?.pageId ?? "");
  const [pixelId, setPixelId] = useState(connection?.pixelId ?? "");

  // Load assets when the picker opens, and again when the account changes so
  // the pixel list matches it.
  useEffect(() => {
    if (!picking || !connection) return;
    let cancelled = false;
    setLoadingAssets(true);
    loadMetaAssets(businessId, adAccountId || null)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) { setAssets(res.assets); setError(null); }
        else setError(res.error);
      })
      .finally(() => { if (!cancelled) setLoadingAssets(false); });
    return () => { cancelled = true; };
  }, [picking, businessId, adAccountId, connection]);

  const startHref = `/api/meta/oauth/start?businessId=${encodeURIComponent(businessId)}`;
  const expiryDays = connection ? daysUntilExpiry(connection) : null;

  function handleSave() {
    const account = assets?.adAccounts.find((a) => a.id === adAccountId);
    const page = assets?.pages.find((p) => p.id === pageId);
    if (!account || !page) {
      setError("Selecciona una cuenta publicitaria y una página.");
      return;
    }
    const pixel = assets?.pixels.find((p) => p.id === pixelId);

    startTransition(async () => {
      const res = await saveMetaSelection({
        businessId,
        adAccountId: account.id,
        adAccountName: account.name,
        adAccountCurrency: account.currency,
        adAccountTimezone: account.timezone,
        pageId: page.id,
        pageName: page.name,
        pixelId: pixel?.id ?? null,
        pixelName: pixel?.name ?? null,
      });
      if (res.ok) { setPicking(false); setError(null); }
      else setError(res.error);
    });
  }

  function handleDisconnect() {
    if (!window.confirm("Se eliminará la credencial de Meta guardada en Mundo Academy. ¿Continuar?")) return;
    startTransition(async () => {
      const res = await disconnectMeta(businessId);
      if (!res.ok) setError(res.error);
      else { setAssets(null); setPicking(false); }
    });
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">Meta Ads</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Conecta tu cuenta publicitaria para poder publicar campañas desde Anuncios.
          </p>
        </div>
        <StatusBadge connection={connection} />
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-[13px] text-red-800" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Not connected / disconnected ── */}
      {(!connection || connection.status === "disconnected") && (
        <a href={startHref} className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors">
          <Link2 className="w-4 h-4" />
          Conectar Meta
        </a>
      )}

      {/* ── Expired ── */}
      {connection?.status === "expired" && (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-gray-600">
            La autorización caducó. Meta no permite renovarla automáticamente, así que hay
            que volver a autorizar.
          </p>
          <a href={startHref} className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors">
            <RefreshCw className="w-4 h-4" />
            Volver a conectar
          </a>
        </div>
      )}

      {/* ── Choosing assets ── */}
      {isLive && picking && (
        <div className="flex flex-col gap-3">
          {loadingAssets ? (
            <p className="flex items-center gap-2 text-[13px] text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando tus activos de Meta…
            </p>
          ) : (
            <>
              <Field label="Cuenta publicitaria" required>
                <select className="input-base" value={adAccountId} onChange={(e) => { setAdAccountId(e.target.value); setPixelId(""); }}>
                  <option value="">Selecciona una cuenta…</option>
                  {assets?.adAccounts.map((a) => (
                    <option key={a.id} value={a.id} disabled={!a.usable}>
                      {a.name} · {a.currency ?? "?"}{a.usable ? "" : " (no disponible)"}
                    </option>
                  ))}
                </select>
                {assets?.adAccounts.length === 0 && (
                  <p className="text-[12px] text-gray-500">No encontramos cuentas publicitarias en tu usuario de Meta.</p>
                )}
              </Field>

              <Field label="Página de Facebook" required help="Es la identidad que firma tus anuncios.">
                <select className="input-base" value={pageId} onChange={(e) => setPageId(e.target.value)}>
                  <option value="">Selecciona una página…</option>
                  {assets?.pages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {assets?.pages.length === 0 && (
                  <p className="text-[12px] text-gray-500">No encontramos páginas que administres.</p>
                )}
              </Field>

              <Field label="Pixel" help="Necesario solo para campañas de ventas o leads.">
                <select className="input-base" value={pixelId} onChange={(e) => setPixelId(e.target.value)} disabled={!adAccountId}>
                  <option value="">Sin pixel</option>
                  {assets?.pixels.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>

              <div className="flex items-center gap-2 pt-1">
                <button type="button" onClick={handleSave} disabled={pending}
                  className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
                  {pending ? "Guardando…" : "Guardar selección"}
                </button>
                {readiness.ready && (
                  <button type="button" onClick={() => setPicking(false)} disabled={pending}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Connected ── */}
      {isLive && !picking && (
        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            <Row label="Cuenta" value={connection.adAccountName ?? "—"} />
            <Row label="Moneda" value={connection.adAccountCurrency ?? "—"} />
            <Row label="Página" value={connection.pageName ?? "—"} />
            <Row label="Pixel" value={connection.pixelName ?? "Sin pixel"} />
            <Row
              label="Caduca"
              value={
                expiryDays === null ? "Sin fecha"
                  : expiryDays < 0 ? "Caducada"
                  : `En ${expiryDays} día${expiryDays === 1 ? "" : "s"}`
              }
            />
          </dl>

          {expiryDays !== null && expiryDays >= 0 && expiryDays <= 7 && (
            <p className="text-[13px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              La autorización caduca pronto. Vuelve a conectar para no interrumpir tus campañas.
            </p>
          )}

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPicking(true)} disabled={pending}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cambiar selección
            </button>
            <button type="button" onClick={handleDisconnect} disabled={pending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-100 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors">
              <Unlink className="w-4 h-4" />
              Desconectar
            </button>
          </div>

          <p className="text-[12px] text-gray-500">
            Desconectar borra la credencial guardada en Mundo Academy. Para retirar además el
            permiso en Meta, hazlo desde Configuración → Apps y sitios web de tu cuenta de Facebook.
          </p>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ connection }: { connection: MetaConnection | null }) {
  const map: Record<string, { label: string; className: string }> = {
    connected:    { label: "Conectado",    className: "bg-green-50 text-green-700 border-green-100" },
    expired:      { label: "Caducado",     className: "bg-amber-50 text-amber-700 border-amber-100" },
    error:        { label: "Con errores",  className: "bg-red-50 text-red-700 border-red-100" },
    connecting:   { label: "Conectando",   className: "bg-blue-50 text-blue-700 border-blue-100" },
    disconnected: { label: "Desconectado", className: "bg-gray-50 text-gray-600 border-gray-200" },
  };
  const state = map[connection?.status ?? "disconnected"] ?? map.disconnected;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-medium ${state.className}`}>
      {connection?.status === "connected" && <CheckCircle2 className="w-3.5 h-3.5" />}
      {state.label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium truncate">{value}</dd>
    </>
  );
}

function Field({
  label, required, help, children,
}: {
  label: string; required?: boolean; help?: string; children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-gray-900">
        {label} {required && <span className="text-red-600" aria-hidden="true">*</span>}
      </span>
      {children}
      {help && <span className="text-[12px] text-gray-500">{help}</span>}
    </label>
  );
}
