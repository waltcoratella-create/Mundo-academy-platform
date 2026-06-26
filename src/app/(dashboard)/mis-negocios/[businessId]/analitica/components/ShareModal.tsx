"use client";

import { useEffect, useRef, useState } from "react";
import type { StatCardData } from "../types";

const THEMES = {
  Melon: { bg: "#E6F4EA", text: "#1E5631", accent: "#55A271", sub: "#3E7D58" },
  Peach: { bg: "#FDECE0", text: "#9A4A1E", accent: "#E8915B", sub: "#B5713E" },
  Plum:  { bg: "#F0E6F6", text: "#5A2A7A", accent: "#8551C0", sub: "#724A95" },
  Apple: { bg: "#FDE6E6", text: "#8A1F1F", accent: "#E83B2F", sub: "#B03A30" },
} as const;
type ThemeName = keyof typeof THEMES;

const PATTERNS = ["Ninguno", "Puntos", "Cuadrícula", "Diagonales", "Verticales", "Círculos"] as const;
type Pattern = (typeof PATTERNS)[number];

const PREF_KEY = "akka-share-prefs";
const lbl: React.CSSProperties = { fontSize: "12px", fontWeight: 500, color: "var(--gray-9, #8D8D8D)", marginBottom: "6px" };
const row: React.CSSProperties = { display: "flex", gap: "8px", flexWrap: "wrap" };
const active: React.CSSProperties = { outline: "2px solid #202020", outlineOffset: "-2px" };

function drawPattern(ctx: CanvasRenderingContext2D, W: number, H: number, pattern: Pattern, color: string) {
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

/** "Compartir estadísticas" modal — renders the card to a canvas and exports PNG. */
export function ShareModal({ data, onClose }: { data: StatCardData; onClose: () => void }) {
  const [theme, setTheme] = useState<ThemeName>("Plum");
  const [pattern, setPattern] = useState<Pattern>("Ninguno");
  const [showLogo, setShowLogo] = useState(true);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
      if (p.theme && p.theme in THEMES) setTheme(p.theme);
      if (p.pattern && (PATTERNS as readonly string[]).includes(p.pattern)) setPattern(p.pattern);
      if (typeof p.showLogo === "boolean") setShowLogo(p.showLogo);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ theme, pattern, showLogo })); } catch { /* ignore */ }
  }, [theme, pattern, showLogo]);

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
    ctx.fillStyle = t.sub; ctx.font = "500 40px Inter, system-ui, sans-serif";
    ctx.fillText(data.title, 80, 150);

    ctx.fillStyle = t.text; ctx.font = "700 120px Inter, system-ui, sans-serif";
    ctx.fillText(data.value ?? "--", 80, 290);

    if (data.delta !== null) {
      ctx.fillStyle = data.delta >= 0 ? "#1E5631" : "#8A1F1F";
      ctx.font = "500 36px Inter, system-ui, sans-serif";
      ctx.fillText(`${data.delta >= 0 ? "▲" : "▼"} ${Math.abs(data.delta).toFixed(1)}%`, 80, 350);
    }

    const cd = data.chartData;
    if (cd.length) {
      const max = Math.max(...cd, 1);
      const cw = W - 160;
      const slot = cw / cd.length;
      const base = H - 130;
      ctx.fillStyle = t.accent;
      cd.forEach((v, i) => {
        const x = 80 + slot * i + slot * 0.15;
        const bh = (v / max) * 230;
        ctx.fillRect(x, base - bh, slot * 0.7, bh);
      });
    }

    if (showLogo) {
      ctx.fillStyle = t.text; ctx.font = "700 34px Inter, system-ui, sans-serif";
      ctx.fillText("Mundo Academy", 80, H - 50);
    }
  }, [theme, pattern, showLogo, data]);

  function toBlob(): Promise<Blob | null> {
    return new Promise((res) => canvasRef.current?.toBlob((b) => res(b), "image/png") ?? res(null));
  }

  async function copy() {
    setBusy(true);
    try {
      const b = await toBlob();
      if (b && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
      }
    } catch { /* ignore */ } finally { setBusy(false); }
  }
  async function save() {
    const b = await toBlob();
    if (!b) return;
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url; a.download = `${data.id}.png`; a.click();
    URL.revokeObjectURL(url);
  }
  async function share() {
    const b = await toBlob();
    if (!b) return;
    const file = new File([b], `${data.id}.png`, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean; share?: (d: unknown) => Promise<void> };
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      try { await nav.share({ files: [file], title: data.title }); return; } catch { /* fall through */ }
    }
    save();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "16px", border: "1px solid var(--gray-a5, rgba(0,0,0,0.122))", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", width: "min(720px, 100%)", maxHeight: "90vh", overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--gray-12, #202020)" }}>Compartir estadísticas</span>
          <button type="button" className="whop-icon-badge" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <canvas ref={canvasRef} style={{ width: "100%", borderRadius: "12px", border: "1px solid var(--gray-a4, rgba(0,0,0,0.09))" }} />

        <div>
          <div style={lbl}>Tema</div>
          <div style={row}>
            {(Object.keys(THEMES) as ThemeName[]).map((n) => (
              <button key={n} type="button" className="btn-surface" style={n === theme ? active : undefined} onClick={() => setTheme(n)}>{n}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={lbl}>Patrón</div>
          <div style={row}>
            {PATTERNS.map((p) => (
              <button key={p} type="button" className="btn-surface" style={p === pattern ? active : undefined} onClick={() => setPattern(p)}>{p}</button>
            ))}
          </div>
        </div>

        <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} />
          <span style={{ fontSize: "14px", color: "var(--gray-12, #202020)" }}>Mostrar logotipo</span>
        </label>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button type="button" className="btn-surface" onClick={copy} disabled={busy}>Copiar</button>
          <button type="button" className="btn-surface" onClick={save}>Guardar imagen</button>
          <button type="button" className="btn-surface" onClick={share}>Compartir</button>
        </div>
      </div>
    </div>
  );
}
