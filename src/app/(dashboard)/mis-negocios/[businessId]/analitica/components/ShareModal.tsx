"use client";

import { useEffect, useRef, useState } from "react";
import type { ShareData } from "../types";
import { THEME_NAMES, PATTERN_NAMES, type ThemeName, type PatternName, type SharePreferences } from "../share-config";
import { saveSharePreferences } from "../share-actions";

const THEMES: Record<ThemeName, { bg: string; text: string; accent: string; sub: string }> = {
  Melon: { bg: "#E6F4EA", text: "#1E5631", accent: "#55A271", sub: "#3E7D58" },
  Peach: { bg: "#FDECE0", text: "#9A4A1E", accent: "#E8915B", sub: "#B5713E" },
  Plum:  { bg: "#F0E6F6", text: "#5A2A7A", accent: "#8551C0", sub: "#724A95" },
  Apple: { bg: "#FDE6E6", text: "#8A1F1F", accent: "#E83B2F", sub: "#B03A30" },
};

const lbl: React.CSSProperties = { fontSize: "12px", fontWeight: 500, color: "var(--gray-9, #8D8D8D)", marginBottom: "6px" };
const rowStyle: React.CSSProperties = { display: "flex", gap: "8px", flexWrap: "wrap" };
const active: React.CSSProperties = { outline: "2px solid #202020", outlineOffset: "-2px" };

function drawPattern(ctx: CanvasRenderingContext2D, W: number, H: number, pattern: PatternName, color: string) {
  if (pattern === "Ninguno") return;
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (pattern === "Puntos") {
    for (let y = 40; y < H; y += 48) for (let x = 40; x < W; x += 48) { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
  } else if (pattern === "Cuadrícula") {
    for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  } else if (pattern === "Diagonales") {
    for (let x = -H; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke(); }
  } else if (pattern === "Verticales") {
    for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  } else if (pattern === "Círculos") {
    for (let y = 0; y < H; y += 80) for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
}

type Status = { kind: "idle" | "loading" | "ok" | "error"; msg?: string };

/** "Compartir tus estadísticas" — renders any card to a canvas and exports PNG. */
export function ShareModal({
  data, businessName, initialPrefs, businessId, onClose,
}: {
  data: ShareData;
  businessName: string;
  initialPrefs: SharePreferences;
  businessId: string;
  onClose: () => void;
}) {
  const [theme, setTheme] = useState<ThemeName>((THEME_NAMES as readonly string[]).includes(initialPrefs.theme) ? (initialPrefs.theme as ThemeName) : "Melon");
  const [pattern, setPattern] = useState<PatternName>((PATTERN_NAMES as readonly string[]).includes(initialPrefs.pattern) ? (initialPrefs.pattern as PatternName) : "Ninguno");
  const [showLogo, setShowLogo] = useState(initialPrefs.showLogo);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const first = useRef(true);

  // Persist preferences (per user + business) on change — skip the first render.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    saveSharePreferences({ businessId, theme, pattern, showLogo }).catch(() => {});
  }, [theme, pattern, showLogo, businessId]);

  // Escape closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Render preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 1200, H = 750;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const t = THEMES[theme];

    ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);
    drawPattern(ctx, W, H, pattern, t.accent);
    ctx.textBaseline = "alphabetic";

    // Branding / business name
    if (showLogo) {
      ctx.fillStyle = t.text; ctx.font = "700 34px Inter, system-ui, sans-serif";
      ctx.fillText(businessName || "Mundo Academy", 80, 90);
    }

    // Title
    ctx.fillStyle = t.sub; ctx.font = "500 40px Inter, system-ui, sans-serif";
    ctx.fillText(data.title, 80, showLogo ? 200 : 150);

    if (data.breakdown) {
      const items = data.breakdown;
      const total = items.reduce((s, it) => s + it.percentage, 0) || 1;
      const bx = 80, by = 250, bw = W - 160, bh = 44;
      let x = bx;
      items.forEach((it) => {
        const segW = (it.percentage / total) * bw;
        ctx.fillStyle = it.color;
        ctx.fillRect(x, by, Math.max(segW - 4, 0), bh);
        x += segW;
      });
      let ly = by + bh + 70;
      ctx.font = "500 30px Inter, system-ui, sans-serif";
      items.forEach((it) => {
        ctx.fillStyle = it.color; ctx.beginPath(); ctx.arc(92, ly - 10, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = t.text; ctx.fillText(`${it.label}   ${it.value ?? "--"}`, 120, ly);
        ly += 48;
      });
    } else {
      ctx.fillStyle = t.text; ctx.font = "700 120px Inter, system-ui, sans-serif";
      ctx.fillText(data.value ?? "--", 80, showLogo ? 340 : 290);
      if (data.delta !== undefined && data.delta !== null) {
        ctx.fillStyle = data.delta >= 0 ? "#1E5631" : "#8A1F1F";
        ctx.font = "500 36px Inter, system-ui, sans-serif";
        ctx.fillText(`${data.delta >= 0 ? "▲" : "▼"} ${Math.abs(data.delta).toFixed(1)}%`, 80, showLogo ? 400 : 350);
      }
      const cd = (data.chartData ?? []).map((v) => Number(v) || 0);
      if (cd.some((v) => v > 0)) {
        const max = Math.max(...cd, 1);
        const cw = W - 160;
        const slot = cw / cd.length;
        const base = H - 130;
        ctx.fillStyle = t.accent;
        cd.forEach((v, i) => {
          const bh = v > 0 ? Math.max((v / max) * 230, 3) : 0;
          ctx.fillRect(80 + slot * i + slot * 0.15, base - bh, slot * 0.7, bh);
        });
      }
    }
  }, [theme, pattern, showLogo, data, businessName]);

  function toBlob(): Promise<Blob | null> {
    return new Promise((res) => canvasRef.current?.toBlob((b) => res(b), "image/png") ?? res(null));
  }

  async function copy() {
    setStatus({ kind: "loading" });
    try {
      const b = await toBlob();
      if (b && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
        setStatus({ kind: "ok", msg: "Copiado al portapapeles" });
      } else {
        setStatus({ kind: "error", msg: "Tu navegador no permite copiar imágenes. Usa Guardar." });
      }
    } catch {
      setStatus({ kind: "error", msg: "No se pudo copiar." });
    }
  }
  async function save() {
    setStatus({ kind: "loading" });
    try {
      const b = await toBlob();
      if (!b) throw new Error();
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url; a.download = `analytics-${data.widgetKey}.png`; a.click();
      URL.revokeObjectURL(url);
      setStatus({ kind: "ok", msg: "Imagen guardada" });
    } catch {
      setStatus({ kind: "error", msg: "No se pudo guardar." });
    }
  }
  async function share() {
    setStatus({ kind: "loading" });
    try {
      const b = await toBlob();
      if (!b) throw new Error();
      const file = new File([b], `analytics-${data.widgetKey}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean; share?: (d: unknown) => Promise<void> };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: data.title });
        setStatus({ kind: "ok", msg: "Compartido" });
      } else {
        await save();
      }
    } catch {
      setStatus({ kind: "error", msg: "No se pudo compartir." });
    }
  }

  const busy = status.kind === "loading";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--gray-a5, rgba(0,0,0,0.122))", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", width: "min(720px, 100%)", maxHeight: "90vh", overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--gray-12, #202020)" }}>Compartir tus estadísticas</span>
          <button type="button" className="whop-icon-badge" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <canvas ref={canvasRef} style={{ width: "100%", borderRadius: "12px", border: "1px solid var(--gray-a4, rgba(0,0,0,0.09))" }} />

        <div>
          <div style={lbl}>Tema</div>
          <div style={rowStyle}>
            {THEME_NAMES.map((n) => (
              <button key={n} type="button" className="btn-surface" style={n === theme ? active : undefined} onClick={() => setTheme(n)}>{n}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={lbl}>Patrón</div>
          <div style={rowStyle}>
            {PATTERN_NAMES.map((p) => (
              <button key={p} type="button" className="btn-surface" style={p === pattern ? active : undefined} onClick={() => setPattern(p)}>{p}</button>
            ))}
          </div>
        </div>

        <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} />
          <span style={{ fontSize: "14px", color: "var(--gray-12, #202020)" }}>Mostrar logotipo</span>
        </label>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
          {status.msg && (
            <span style={{ marginRight: "auto", fontSize: "13px", color: status.kind === "error" ? "#E83B2F" : "var(--gray-a11, rgba(0,0,0,0.608))" }}>
              {status.msg}
            </span>
          )}
          <button type="button" className="btn-surface" onClick={copy} disabled={busy}>Copiar</button>
          <button type="button" className="btn-surface" onClick={save} disabled={busy}>Guardar imagen</button>
          <button type="button" className="btn-surface" onClick={share} disabled={busy}>Compartir</button>
        </div>
      </div>
    </div>
  );
}
