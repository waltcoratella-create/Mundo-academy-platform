"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import type { CampaignCreative, CampaignDraft, Errors, MediaType } from "../campaign-types";
import { CTA_OPTIONS } from "../campaign-types";
import { StepHeading, TextField, TextAreaField, SelectField, Field } from "./Field";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime";

export type UploadFn = (file: File) => Promise<{ url?: string; error?: string }>;

export function StepCreative({
  draft,
  errors,
  uploadMedia,
  onChange,
}: {
  draft: CampaignDraft;
  errors: Errors;
  /** When omitted the file is only previewed locally and never leaves the browser. */
  uploadMedia?: UploadFn;
  onChange: (patch: Partial<CampaignDraft>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const c = draft.creative;

  // Revoke the object URL when it changes or the step unmounts.
  useEffect(() => {
    return () => { if (localPreview) URL.revokeObjectURL(localPreview); };
  }, [localPreview]);

  function patchCreative(patch: Partial<CampaignCreative>) {
    onChange({ creative: { ...c, ...patch } });
  }

  async function handleFile(file: File) {
    setUploadError(null);
    const mediaType: MediaType = file.type.startsWith("video/") ? "video" : "image";

    // Immediate local preview regardless of whether we can persist it.
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return objectUrl; });
    patchCreative({ mediaType });

    if (!uploadMedia) return;

    setUploading(true);
    try {
      const res = await uploadMedia(file);
      if (res.error) setUploadError(res.error);
      else if (res.url) patchCreative({ mediaUrl: res.url, mediaType });
    } catch {
      setUploadError("No se pudo subir el archivo. Inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  function clearMedia() {
    setLocalPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setUploadError(null);
    patchCreative({ mediaUrl: null, mediaType: null });
    if (inputRef.current) inputRef.current.value = "";
  }

  const previewSrc = c.mediaUrl ?? localPreview;

  return (
    <>
      <StepHeading
        title="Creatividad"
        hint="El anuncio que verá la gente."
      />

      <Field label="Imagen o vídeo">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        {previewSrc ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="adsc-media">
              {c.mediaType === "video" ? (
                <video src={previewSrc} controls preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewSrc} alt="Vista previa de la creatividad" />
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn-surface" onClick={() => inputRef.current?.click()} disabled={uploading}>
                Cambiar archivo
              </button>
              <button type="button" className="btn-surface" onClick={clearMedia} disabled={uploading}>
                <Trash2 size={14} strokeWidth={2} />
                Quitar
              </button>
              {uploading && (
                <span className="adsc-help" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Loader2 size={13} className="adsc-spin" />
                  Subiendo…
                </span>
              )}
              {!uploading && !c.mediaUrl && (
                <span className="adsc-help">Vista previa local — se subirá al guardar.</span>
              )}
            </div>
          </div>
        ) : (
          <button type="button" className="adsc-drop" onClick={() => inputRef.current?.click()}>
            <ImagePlus size={22} strokeWidth={1.8} />
            <span className="adsc-drop__title">Sube una imagen o un vídeo</span>
            <span className="adsc-drop__hint">JPG, PNG, WebP, GIF · MP4, WebM, MOV</span>
          </button>
        )}

        {uploadError && <span className="adsc-error" role="alert">{uploadError}</span>}
      </Field>

      <TextAreaField
        label="Texto principal"
        value={c.primaryText}
        onChange={(primaryText) => patchCreative({ primaryText })}
        error={errors.primaryText}
        placeholder="Cuenta en una o dos frases por qué merece la pena."
        maxLength={500}
        rows={3}
      />

      <TextField
        label="Título"
        value={c.headline}
        onChange={(headline) => patchCreative({ headline })}
        error={errors.headline}
        placeholder="Aprende a vender online"
        maxLength={120}
      />

      <TextField
        label="Descripción"
        value={c.description}
        onChange={(description) => patchCreative({ description })}
        placeholder="Acceso inmediato · Garantía 30 días"
        maxLength={200}
      />

      <div className="adsc-grid adsc-grid-2">
        <SelectField
          label="Llamada a la acción (CTA)"
          value={c.cta}
          onChange={(cta) => patchCreative({ cta })}
          options={CTA_OPTIONS}
        />
        <TextField
          label="URL de destino"
          value={c.destinationUrl}
          onChange={(destinationUrl) => patchCreative({ destinationUrl })}
          error={errors.destinationUrl}
          placeholder="https://…"
          help="Se rellena desde el paso Producto; puedes cambiarla."
          inputMode="url"
        />
      </div>
    </>
  );
}
