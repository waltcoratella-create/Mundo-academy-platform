"use client";

/**
 * AkkaCore — polished orbital "AI core" loader (no dependencies).
 *
 * Layers: faint static concentric rings, a slowly-rotating conic "scan" sweep
 * masked into a thin ring, particles orbiting on each ring at different speeds,
 * and a breathing central core with a soft neutral halo. Minimal, monochrome,
 * transparent background. `intense` speeds everything up for the analyzing view.
 */
export function AkkaCore({ size = 96, intense = false }: { size?: number; intense?: boolean }) {
  const sweep  = intense ? "2.6s" : "5.5s";
  const orbitA = intense ? "4.2s" : "9s";
  const orbitB = intense ? "3.4s" : "7s";
  const orbitC = intense ? "2.6s" : "5.2s";
  const breathe = intense ? "1.6s" : "3.2s";
  const px = (f: number) => Math.max(2, Math.round(size * f));

  // A dot sitting on the top edge of an orbit ring; the wrapper rotation orbits it.
  const Orbit = ({
    inset, dur, reverse, dotPx, color, opacity = 1,
  }: { inset: string; dur: string; reverse?: boolean; dotPx: number; color: string; opacity?: number }) => (
    <div
      className="akka-anim absolute"
      style={{ inset, animation: `${reverse ? "akkaSpinRev" : "akkaSpin"} ${dur} linear infinite` }}
    >
      <span
        className="absolute rounded-full"
        style={{
          width: dotPx, height: dotPx, background: color, opacity,
          top: 0, left: "50%", transform: "translate(-50%,-50%)",
          boxShadow: `0 0 ${Math.round(dotPx * 1.4)}px ${color}`,
        }}
      />
    </div>
  );

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <style>{`
        @keyframes akkaSpin    { to { transform: rotate(360deg); } }
        @keyframes akkaSpinRev { to { transform: rotate(-360deg); } }
        @keyframes akkaBreathe { 0%,100% { transform: scale(1);    opacity:.9 } 50% { transform: scale(1.12); opacity:1 } }
        @keyframes akkaHalo    { 0%,100% { transform: scale(1);    opacity:.18 } 50% { transform: scale(1.25); opacity:.34 } }
        @media (prefers-reduced-motion: reduce) { .akka-anim { animation: none !important; } }
      `}</style>

      {/* Static concentric rings (r = 46 / 34 / 22 on a 100 viewBox) */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1" />
        <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
        <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      </svg>

      {/* Rotating conic "scan" sweep, masked into a thin outer ring */}
      <div
        className="akka-anim absolute inset-[4%] rounded-full"
        style={{
          background: "conic-gradient(from 0deg, transparent 0deg, rgba(0,0,0,0.22) 70deg, transparent 150deg)",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.5px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.5px))",
          animation: `akkaSpin ${sweep} linear infinite`,
        }}
      />

      {/* Orbiting particles — aligned to the three rings */}
      <Orbit inset="4%"  dur={orbitA} dotPx={px(0.045)} color="#202020" />
      <Orbit inset="16%" dur={orbitB} reverse dotPx={px(0.035)} color="rgba(0,0,0,0.45)" />
      <Orbit inset="28%" dur={orbitC} dotPx={px(0.03)} color="#202020" opacity={0.85} />

      {/* Soft neutral halo behind the core */}
      <div
        className="akka-anim absolute rounded-full"
        style={{
          inset: "30%",
          background: "radial-gradient(circle, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0) 70%)",
          animation: `akkaHalo ${breathe} ease-in-out infinite`,
        }}
      />

      {/* Central core */}
      <div
        className="akka-anim absolute rounded-full"
        style={{
          inset: "41%",
          background: "radial-gradient(circle at 35% 30%, #4a4a4a, #1a1a1a)",
          boxShadow: `0 0 ${px(0.1)}px rgba(0,0,0,0.25)`,
          animation: `akkaBreathe ${breathe} ease-in-out infinite`,
        }}
      />
    </div>
  );
}
