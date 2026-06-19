"use client";

/**
 * AkkaCore — self-contained animated "AI core" (no dependencies).
 * Outer rotating ring + counter-rotating dashed ring + orbiting dots +
 * breathing core and glow. `intense` speeds it up for the analyzing screen.
 */
export function AkkaCore({ size = 96, intense = false }: { size?: number; intense?: boolean }) {
  const spin    = intense ? "6s"  : "12s";
  const spinRev = intense ? "5s"  : "10s";
  const pulse   = intense ? "1.5s" : "2.6s";
  const dot = (f: number) => Math.max(3, Math.round(size * f));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <style>{`
        @keyframes akkaSpin    { to { transform: rotate(360deg); } }
        @keyframes akkaSpinRev { to { transform: rotate(-360deg); } }
        @keyframes akkaPulse   { 0%,100% { transform: scale(1); opacity:.9 } 50% { transform: scale(1.08); opacity:1 } }
        @keyframes akkaGlow    { 0%,100% { opacity:.16; transform: scale(1) } 50% { opacity:.40; transform: scale(1.18) } }
        @media (prefers-reduced-motion: reduce) { .akka-anim { animation: none !important; } }
      `}</style>

      {/* Glow */}
      <div
        className="akka-anim absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(124,108,240,0.55) 0%, rgba(124,108,240,0) 65%)",
          animation: `akkaGlow ${pulse} ease-in-out infinite`,
        }}
      />

      {/* Outer ring + orbiting dots */}
      <div className="akka-anim absolute inset-0" style={{ animation: `akkaSpin ${spin} linear infinite` }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="2" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="#202020" strokeWidth="2" strokeLinecap="round" strokeDasharray="42 222" />
        </svg>
        <span className="absolute rounded-full" style={{ width: dot(0.07), height: dot(0.07), background: "#7c6cf0", top: "3%", left: "50%", transform: "translateX(-50%)" }} />
        <span className="absolute rounded-full" style={{ width: dot(0.05), height: dot(0.05), background: "#202020", bottom: "9%", left: "22%" }} />
      </div>

      {/* Inner counter-rotating dashed ring */}
      <div className="akka-anim absolute inset-[20%]" style={{ animation: `akkaSpinRev ${spinRev} linear infinite` }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,0.13)" strokeWidth="3" strokeDasharray="9 15" />
        </svg>
      </div>

      {/* Core */}
      <div
        className="akka-anim absolute rounded-full"
        style={{
          inset: "35%",
          background: "radial-gradient(circle at 35% 30%, #3a3a3a, #202020)",
          boxShadow: "0 0 12px rgba(124,108,240,0.5)",
          animation: `akkaPulse ${pulse} ease-in-out infinite`,
        }}
      />
    </div>
  );
}
