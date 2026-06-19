"use client";

/**
 * AkkaCore — the Magic UI / 21st.dev "AI Loader" (beratberkayg) integrated as-is.
 *
 * Exact component: a centered word whose letters pulse in sequence
 * (loaderLetter, staggered animationDelay) over a full circle whose rotating
 * inset box-shadows create the glowing AI orb (loaderCircle). Keyframes and
 * box-shadow values are kept identical to the original.
 *
 * Minimal adaptations for this project:
 *  - removed the original fullscreen overlay + background gradient (transparent bg)
 *  - letters use a dark color so they read on our white surfaces
 *  - `size` (px), `intense` (faster) and `text` props
 *  - prefers-reduced-motion support
 */
export function AkkaCore({
  size = 96,
  intense = false,
  text = "Akka",
}: {
  size?: number;
  intense?: boolean;
  text?: string;
}) {
  const circleDur = intense ? "2.5s" : "5s";
  const letterDur = intense ? "1.6s" : "3s";
  const letters = text.split("");

  return (
    <div
      className="relative flex items-center justify-center font-inter select-none shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes loaderCircle {
          0%   { transform: rotate(90deg);  box-shadow: 0 6px 12px 0 #38bdf8 inset, 0 12px 18px 0 #005dff inset, 0 36px 36px 0 #1e40af inset, 0 0 3px 1.2px rgba(56,189,248,0.3), 0 0 6px 1.8px rgba(0,93,255,0.2); }
          50%  { transform: rotate(270deg); box-shadow: 0 6px 12px 0 #60a5fa inset, 0 12px 6px 0 #0284c7 inset, 0 24px 36px 0 #005dff inset, 0 0 3px 1.2px rgba(56,189,248,0.3), 0 0 6px 1.8px rgba(0,93,255,0.2); }
          100% { transform: rotate(450deg); box-shadow: 0 6px 12px 0 #4dc8fd inset, 0 12px 18px 0 #005dff inset, 0 36px 36px 0 #1e40af inset, 0 0 3px 1.2px rgba(56,189,248,0.3), 0 0 6px 1.8px rgba(0,93,255,0.2); }
        }
        @keyframes loaderLetter {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          20%      { opacity: 1;   transform: scale(1.15); }
          40%      { opacity: 0.7; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .akka-circle, .akka-letter { animation: none !important; }
        }
      `}</style>

      {letters.map((ch, i) => (
        <span
          key={i}
          className="akka-letter inline-block text-[#0f172a] opacity-40"
          style={{
            animationName: "loaderLetter",
            animationDuration: letterDur,
            animationIterationCount: "infinite",
            animationDelay: `${i * 0.1}s`,
          }}
        >
          {ch}
        </span>
      ))}

      <div
        className="akka-circle absolute inset-0 rounded-full"
        style={{
          animationName: "loaderCircle",
          animationDuration: circleDur,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      />
    </div>
  );
}
