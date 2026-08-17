import Link from "next/link";
import { ArrowRight } from "lucide-react";
import "./hero.css";

/**
 * Landing hero — Shopify-style stacked cards with Whop-style explicit actions.
 *
 * The background is a temporary neutral gradient. `.hero-background-track` is
 * already oversized, transform-driven and slowly animated, so dropping the
 * final collage in only means swapping the gradient for an image in hero.css.
 *
 * All three destinations are existing routes; none were invented:
 *   /crear     → real business-creation flow
 *   /cursos    → the learning area (/mentorias and /eventos do not exist)
 *   /descubrir → the public discovery area
 * `/crear` and `/cursos` sit behind the Clerk middleware, so an unauthenticated
 * visitor is sent to sign-in and returned to the same route afterwards.
 */

const ACTIONS = [
  { href: "/crear",     label: "Crea un negocio",                 variant: "primary" as const },
  { href: "/cursos",    label: "Aprende de los que ya lo lograron", variant: "secondary" as const },
  { href: "/descubrir", label: "Explora formas de ganar",          variant: "secondary" as const },
];

export function HeroActions() {
  return (
    <div className="hero-actions">
      {ACTIONS.map(({ href, label, variant }) => (
        <Link key={href} href={href} className={`hero-pill hero-pill--${variant}`}>
          {label}
          <ArrowRight className="hero-pill__icon" size={18} strokeWidth={2.2} aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <main className="ma-hero">
      <div className="hero-visual" aria-hidden="true">
        <div className="hero-background-track" />
        <div className="hero-legibility" />
      </div>

      <div className="hero-content">
        <section className="hero-card hero-card--light">
          <h1 className="hero-title">Convierte tus ideas en negocios.</h1>
          <p className="hero-body">
            Aprende de quienes ya lo hicieron, crea lo tuyo y descubre nuevas
            formas de crecer con Mundo Academy.
          </p>
        </section>

        <section className="hero-card hero-card--dark">
          <div className="hero-dark-head">
            <h2 className="hero-dark-title">Empieza ahora</h2>
            <p className="hero-dark-sub">Elige cómo quieres empezar.</p>
          </div>
          <HeroActions />
        </section>
      </div>
    </main>
  );
}
