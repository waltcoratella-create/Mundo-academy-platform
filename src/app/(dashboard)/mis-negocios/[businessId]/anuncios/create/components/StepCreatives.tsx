"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ChevronDown, ChevronLeft, ChevronRight, Plus, Copy, Upload, Trash2, Loader2, AlertCircle,
} from "lucide-react";
import type { CampaignAd, CampaignDraft, Errors, MediaType } from "../campaign-types";
import { CTA_OPTIONS, emptyAd } from "../campaign-types";

/**
 * Creatives — the two-panel editor from the Whop Ads build spec.
 *
 * Left: the campaign tree (one group, its ads). Right: a dotted canvas where
 * files are dropped or uploaded; each file becomes one ad in the group.
 *
 * There is no ad-group entity in Supabase, so the group is a presentational
 * container — every ad lives in this campaign's `creative.ads` list. Nothing
 * here creates rows of its own.
 */

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime";

export type UploadFn = (file: File) => Promise<{ url?: string; error?: string }>;

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; total: number; done: number }
  | { status: "error"; message: string };

function adLabel(index: number) {
  return `Anuncio ${index + 1}`;
}

export function StepCreatives({
  draft,
  errors,
  uploadMedia,
  onChange,
}: {
  draft: CampaignDraft;
  errors: Errors;
  uploadMedia?: UploadFn;
  onChange: (patch: Partial<CampaignDraft>) => void;
}) {
  const ads = draft.creative.ads;
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string>(ads[0]?.id ?? "");
  const [railOpen, setRailOpen] = useState(true);
  const [groupOpen, setGroupOpen] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const [mobilePicker, setMobilePicker] = useState(false);
  const groupId = useId();

  // Keep a valid selection when ads are added or removed.
  useEffect(() => {
    if (ads.length === 0) return;
    if (!ads.some((a) => a.id === selectedId)) setSelectedId(ads[0].id);
  }, [ads, selectedId]);

  const selectedIndex = Math.max(0, ads.findIndex((a) => a.id === selectedId));
  const selected: CampaignAd | undefined = ads[selectedIndex];

  function setAds(next: CampaignAd[]) {
    onChange({ creative: { ads: next } });
  }
  function patchAd(id: string, patch: Partial<CampaignAd>) {
    setAds(ads.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function addAd() {
    // Seed the destination from an existing ad so the new one is consistent.
    const ad = emptyAd(ads[0]?.destinationUrl ?? "");
    setAds([...ads, ad]);
    setSelectedId(ad.id);
    setMobilePicker(false);
  }

  function duplicateAd(id: string) {
    const source = ads.find((a) => a.id === id);
    if (!source) return;
    // Reuses the same media URL — the file is not re-uploaded.
    const copy: CampaignAd = { ...source, id: emptyAd().id };
    const at = ads.findIndex((a) => a.id === id);
    setAds([...ads.slice(0, at + 1), copy, ...ads.slice(at + 1)]);
    setSelectedId(copy.id);
  }

  function removeAd(id: string) {
    const ad = ads.find((a) => a.id === id);
    const hasContent = Boolean(ad && (ad.mediaUrl || ad.primaryText.trim() || ad.headline.trim()));
    if (hasContent && !window.confirm("Se eliminará este anuncio y su contenido. ¿Continuar?")) return;
    const next = ads.filter((a) => a.id !== id);
    setAds(next.length ? next : [emptyAd(ad?.destinationUrl ?? "")]);
  }

  /** One file → one ad. Files upload sequentially so progress stays truthful. */
  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    if (!uploadMedia) {
      setUpload({ status: "error", message: "La subida no está disponible ahora mismo." });
      return;
    }

    setUpload({ status: "uploading", total: list.length, done: 0 });
    const created: CampaignAd[] = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const mediaType: MediaType = file.type.startsWith("video/") ? "video" : "image";
      const res = await uploadMedia(file);
      if (res.error) {
        setUpload({ status: "error", message: res.error });
        if (created.length) commit(created);
        return;
      }
      if (res.url) {
        created.push({ ...emptyAd(ads[0]?.destinationUrl ?? ""), mediaUrl: res.url, mediaType });
      }
      setUpload({ status: "uploading", total: list.length, done: i + 1 });
    }

    commit(created);
    setUpload({ status: "idle" });
  }

  function commit(created: CampaignAd[]) {
    if (created.length === 0) return;
    // Replace a still-blank first ad rather than leaving an empty one behind.
    const base = ads.length === 1 && !ads[0].mediaUrl && !ads[0].primaryText.trim() ? [] : ads;
    const next = [...base, ...created];
    setAds(next);
    setSelectedId(created[created.length - 1].id);
  }

  const isUploading = upload.status === "uploading";

  // ── Rail ────────────────────────────────────────────────────────────────
  const rail = (
    <div className="cr-rail" data-open={railOpen}>
      <div className="cr-rail__head">
        <span className="cr-rail__campaign" title={draft.name || "Campaña"}>
          {draft.name || "Campaña sin nombre"}
        </span>
        <button type="button" className="cr-iconbtn" onClick={addAd} aria-label="Agregar anuncio">
          <Plus size={16} strokeWidth={2.2} />
        </button>
      </div>

      <div className="cr-group">
        <div className="cr-group__row" data-active="true">
          <button
            type="button"
            className="cr-group__toggle"
            aria-expanded={groupOpen}
            aria-controls={groupId}
            onClick={() => setGroupOpen((v) => !v)}
          >
            <ChevronDown className="cr-group__chev" size={14} strokeWidth={2.4} data-open={groupOpen} aria-hidden="true" />
            <span className="cr-dot" aria-hidden="true" />
            Grupo de anuncios 1
          </button>
          <span className="cr-iconbtn cr-iconbtn--ghost" aria-hidden="true" title="Un solo grupo por ahora">
            <Copy size={14} strokeWidth={2} />
          </span>
        </div>

        {groupOpen && (
          <ul className="cr-adlist" id={groupId} role="listbox" aria-label="Anuncios del grupo">
            {ads.map((ad, i) => (
              <li key={ad.id}>
                <div className="cr-ad" data-selected={ad.id === selectedId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={ad.id === selectedId}
                    className="cr-ad__btn"
                    onClick={() => { setSelectedId(ad.id); setMobilePicker(false); }}
                  >
                    {ad.mediaUrl ? (
                      <span className="cr-ad__thumb" aria-hidden="true">
                        {ad.mediaType === "video"
                          // eslint-disable-next-line jsx-a11y/media-has-caption
                          ? <video src={ad.mediaUrl} muted preload="metadata" />
                          // eslint-disable-next-line @next/next/no-img-element
                          : <img src={ad.mediaUrl} alt="" />}
                      </span>
                    ) : (
                      <span className="cr-ad__thumb cr-ad__thumb--empty" aria-hidden="true" />
                    )}
                    {adLabel(i)}
                  </button>
                  <button
                    type="button"
                    className="cr-iconbtn cr-iconbtn--sm"
                    onClick={() => duplicateAd(ad.id)}
                    aria-label={`Duplicar ${adLabel(i)}`}
                  >
                    <Copy size={13} strokeWidth={2} />
                  </button>
                </div>
              </li>
            ))}
            <li>
              <button type="button" className="cr-additem" onClick={addAd}>
                <Plus size={13} strokeWidth={2.2} aria-hidden="true" />
                Agregar anuncio
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );

  // ── Canvas ──────────────────────────────────────────────────────────────
  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragging(true); },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget === e.target) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
    },
  };

  return (
    <div className="cr-layout">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple
        style={{ display: "none" }}
        onChange={(e) => { if (e.target.files?.length) void handleFiles(e.target.files); e.target.value = ""; }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept={ACCEPT}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f || !selected || !uploadMedia) return;
          const mediaType: MediaType = f.type.startsWith("video/") ? "video" : "image";
          setUpload({ status: "uploading", total: 1, done: 0 });
          void uploadMedia(f).then((res) => {
            if (res.error) { setUpload({ status: "error", message: res.error }); return; }
            if (res.url) patchAd(selected.id, { mediaUrl: res.url, mediaType });
            setUpload({ status: "idle" });
          });
        }}
      />

      {/* Mobile: the rail becomes a sheet instead of a permanent second panel. */}
      <div className="cr-mobilebar">
        <button type="button" className="cr-mobilebar__btn" onClick={() => setMobilePicker((v) => !v)} aria-expanded={mobilePicker}>
          <ChevronDown size={14} strokeWidth={2.2} aria-hidden="true" />
          {selected ? adLabel(selectedIndex) : "Anuncios"}
          <span className="cr-mobilebar__count">{ads.length}</span>
        </button>
        <button type="button" className="cr-iconbtn" onClick={addAd} aria-label="Agregar anuncio">
          <Plus size={16} strokeWidth={2.2} />
        </button>
      </div>
      {mobilePicker && <div className="cr-sheet">{rail}</div>}

      <div className="cr-desktoprail">
        {railOpen && rail}
        <button
          type="button"
          className="cr-collapse"
          onClick={() => setRailOpen((v) => !v)}
          aria-label={railOpen ? "Colapsar panel" : "Expandir panel"}
          aria-expanded={railOpen}
        >
          {railOpen ? <ChevronLeft size={14} strokeWidth={2.4} /> : <ChevronRight size={14} strokeWidth={2.4} />}
        </button>
      </div>

      <div
        className="cr-canvas"
        data-dragging={dragging}
        {...dropHandlers}
      >
        <div className="cr-canvas__pill">Grupo de anuncios 1</div>

        {upload.status === "error" && (
          <div className="cr-alert" role="alert">
            <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
            {upload.message}
          </div>
        )}

        {isUploading && (
          <div className="cr-alert cr-alert--info" role="status">
            <Loader2 size={16} className="adsc-spin" aria-hidden="true" />
            Subiendo {upload.done + 1} de {upload.total}…
          </div>
        )}

        {!selected || !selected.mediaUrl ? (
          // Empty state — drop zone
          <div className="cr-empty">
            <p className="cr-empty__msg">Suelta creativos aquí, o sube algunos para comenzar.</p>
            <button type="button" className="cr-upload" onClick={() => fileRef.current?.click()} disabled={isUploading}>
              <Upload size={14} strokeWidth={2.2} aria-hidden="true" />
              Subir creativos
            </button>
            <span className="cr-empty__hint">JPG, PNG, WebP · MP4, WebM, MOV</span>
          </div>
        ) : (
          <div className="cr-editor">
            <div className="cr-editor__media">
              {selected.mediaType === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={selected.mediaUrl} controls preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.mediaUrl} alt={`Creatividad de ${adLabel(selectedIndex)}`} />
              )}
              <div className="cr-editor__mediaactions">
                <button type="button" className="cr-smallbtn" onClick={() => replaceRef.current?.click()} disabled={isUploading}>
                  Reemplazar
                </button>
                <button type="button" className="cr-smallbtn" onClick={() => patchAd(selected.id, { mediaUrl: null, mediaType: null })}>
                  Quitar media
                </button>
                <button type="button" className="cr-smallbtn cr-smallbtn--danger" onClick={() => removeAd(selected.id)}>
                  <Trash2 size={13} strokeWidth={2} aria-hidden="true" />
                  Eliminar anuncio
                </button>
              </div>
            </div>

            <div className="cr-editor__fields">
              <AdField
                label="Texto principal"
                error={errors[`ad.${selected.id}.primaryText`]}
                value={selected.primaryText}
                onChange={(primaryText) => patchAd(selected.id, { primaryText })}
                textarea
                maxLength={500}
                placeholder="Cuenta en una o dos frases por qué merece la pena."
              />
              <AdField
                label="Titular"
                error={errors[`ad.${selected.id}.headline`]}
                value={selected.headline}
                onChange={(headline) => patchAd(selected.id, { headline })}
                maxLength={120}
                placeholder="Aprende a vender online"
              />
              <AdField
                label="Descripción"
                value={selected.description}
                onChange={(description) => patchAd(selected.id, { description })}
                maxLength={200}
                placeholder="Acceso inmediato · Garantía 30 días"
              />
              <AdSelect
                label="Llamada a la acción"
                value={selected.cta}
                options={CTA_OPTIONS}
                onChange={(cta) => patchAd(selected.id, { cta })}
              />
              <AdField
                label="URL de destino"
                error={errors[`ad.${selected.id}.destinationUrl`]}
                value={selected.destinationUrl}
                onChange={(destinationUrl) => patchAd(selected.id, { destinationUrl })}
                placeholder="https://…"
              />

              <div className="cr-preview">
                <span className="cr-preview__label">Vista previa</span>
                <p className="cr-preview__note">
                  Aproximación con tus datos. El aspecto final lo decide cada ubicación de Meta.
                </p>
                <div className="cr-preview__card">
                  {selected.mediaType === "video" ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={selected.mediaUrl} muted preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.mediaUrl} alt="" />
                  )}
                  <div className="cr-preview__body">
                    <span className="cr-preview__headline">{selected.headline || "Titular del anuncio"}</span>
                    <span className="cr-preview__desc">{selected.description || "Descripción"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdField({
  label, value, onChange, error, textarea, maxLength, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  textarea?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="w-section" data-field="true">
      <label className="w-label" htmlFor={id}>{label}</label>
      {textarea ? (
        <textarea
          id={id}
          className="w-input cr-textarea"
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type="text"
          className="w-input"
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && <span className="w-error" role="alert">{error}</span>}
    </div>
  );
}

function AdSelect({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="w-section" data-field="true">
      <label className="w-label" htmlFor={id}>{label}</label>
      <select id={id} className="w-select w-select--block" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
