"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, AlertCircle } from "lucide-react";
import { uploadProductCover } from "@/app/actions/upload-actions";

interface Props {
  productId:       string;
  businessId:      string;
  initialCoverUrl: string | null;
  gradient:        string; // Tailwind gradient classes used as fallback
  productInitial:  string;
}

export function ProductCoverUpload({
  productId,
  businessId,
  initialCoverUrl,
  gradient,
  productInitial,
}: Props) {
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setLoading(true);
    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadProductCover(productId, businessId, fd);
    setLoading(false);
    if (result.error) setError(result.error);
    else if (result.url) setCoverUrl(result.url);
  }

  return (
    <div className="relative w-16 h-16 shrink-0 group">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      {/* Cover image or gradient fallback */}
      <div className={`w-16 h-16 rounded-2xl overflow-hidden shadow-md bg-gradient-to-br ${gradient}`}>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-2xl font-bold text-white select-none">
            {productInitial}
          </span>
        )}
      </div>

      {/* Camera overlay — appears on hover */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        title="Cambiar imagen de portada"
        className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        ) : (
          <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
        )}
      </button>

      {/* Inline error — shown below the avatar */}
      {error && (
        <div className="absolute top-full left-0 mt-2 z-20 w-64 px-3 py-2 bg-red-50 border border-red-200 rounded-lg shadow-md">
          <p className="flex items-start gap-1.5 text-xs text-red-600 leading-relaxed">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
