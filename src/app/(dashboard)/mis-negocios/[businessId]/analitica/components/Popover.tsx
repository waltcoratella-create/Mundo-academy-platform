"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface PopoverProps {
  /** The trigger element (a pill button). */
  trigger: (o: { open: boolean; toggle: () => void }) => ReactNode;
  /** The panel content; receives `close` to dismiss. */
  children: (close: () => void) => ReactNode;
}

/**
 * Popover primitive: the panel is rendered in a Portal to document.body with
 * position:fixed computed from the trigger rect, so it never depends on any
 * ancestor's overflow / containment. Closes on outside click and Escape, and
 * repositions on scroll/resize (including horizontal scroll of the pill row).
 */
export function Popover({ trigger, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const pw = panelRef.current?.offsetWidth ?? 220;
    const left = Math.max(8, Math.min(t.left, window.innerWidth - pw - 8));
    setPos({ top: Math.round(t.bottom + 4), left: Math.round(left) });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const raf = requestAnimationFrame(place); // re-measure once the panel has width
    const reflow = () => place();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", reflow, true);
    window.addEventListener("resize", reflow);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", reflow, true);
      window.removeEventListener("resize", reflow);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, place]);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <span ref={triggerRef} style={{ display: "inline-flex" }}>
      {trigger({ open, toggle })}
      {mounted && open &&
        createPortal(
          <div
            className="analytics-page"
            style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, zIndex: 1000, background: "transparent" }}
          >
            <div ref={panelRef}>{children(close)}</div>
          </div>,
          document.body,
        )}
    </span>
  );
}
