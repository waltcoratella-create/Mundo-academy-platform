interface EmptyStateBadgeProps {
  /** Vertical position of the badge centre within the relative chart container. */
  top?: string;
  /** translate applied after positioning. */
  transform?: string;
}

/**
 * "No hay datos disponibles" badge, centred over a chart area when there is no data.
 * height 20px · padding 0 8px · radius 6px · bg gray-3 · color rgba(0,0,0,0.608) · 12px/500
 */
export function EmptyStateBadge({ top = "50%", transform = "translate(-50%, -100%)" }: EmptyStateBadgeProps) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "20px",
        padding: "0 8px",
        borderRadius: "6px",
        background: "var(--gray-3, #EFEFEF)",
        color: "rgba(0,0,0,0.608)",
        fontSize: "12px",
        fontWeight: 500,
        lineHeight: "16px",
        whiteSpace: "nowrap",
        position: "absolute",
        top,
        left: "50%",
        transform,
        pointerEvents: "none",
      }}
    >
      No hay datos disponibles
    </span>
  );
}
