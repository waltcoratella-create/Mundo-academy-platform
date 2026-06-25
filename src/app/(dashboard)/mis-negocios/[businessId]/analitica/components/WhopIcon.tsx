"use client";

import React from "react";

/**
 * Small double-chevron glyph shown in the top-right of each stat card.
 * viewBox 0 0 40 26 · ~17px.
 */
export function WhopIcon({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 26) / 40}
      viewBox="0 0 40 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M3 3 L15 13 L3 23" stroke="var(--gray-12, #202020)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3 L33 13 L21 23" stroke="var(--gray-12, #202020)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 24×24 surface button wrapping the icon. radius 6px · surface shadow.
 */
export function WhopIconButton({ onClick }: { onClick?: React.MouseEventHandler }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ver detalle"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "24px",
        borderRadius: "6px",
        background: "#ffffff",
        border: "none",
        boxShadow: "rgba(0,0,0,0.122) 0px 0px 0px 1px inset, rgba(0,0,0,0.05) 0px 1px 2px 0px",
        cursor: "pointer",
        flexShrink: 0,
        marginLeft: "auto",
        color: "var(--gray-12, #202020)",
      }}
    >
      <WhopIcon size={13} />
    </button>
  );
}
