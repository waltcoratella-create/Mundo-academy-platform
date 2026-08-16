import Link from "next/link";

/**
 * Landing hero. The two CTAs are deliberately button-cards (312×80, radius 24),
 * not dashboard buttons — the reference treats them as the two primary
 * decisions, so they carry the visual weight.
 *
 * Both destinations are existing routes:
 *   /crear     → real business-creation flow. It sits behind the Clerk
 *                middleware, so an unauthenticated visitor is sent to sign-in
 *                and returned here afterwards — no parallel flow needed.
 *   /descubrir → the existing public discovery area.
 */
export function HeroActions() {
  return (
    <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
      <Link
        href="/crear"
        className="
          w-[min(100%,312px)] h-20 px-6 rounded-3xl
          flex items-center justify-center cursor-pointer
          bg-[#FA4616] border border-[#B62600] text-white
          font-inter text-xl font-semibold leading-[30px] tracking-[-0.33px]
          transition-colors duration-150
          hover:bg-[#E63D0F] active:bg-[#D63709]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FA4616]/40 focus-visible:ring-offset-2
        "
      >
        Crear un negocio
      </Link>

      <Link
        href="/descubrir"
        className="
          w-[min(100%,312px)] h-20 px-6 rounded-3xl
          flex items-center justify-center cursor-pointer
          bg-[#FCFCFC] border border-[#E0E0E0] text-[#202020]
          font-inter text-xl font-semibold leading-[30px] tracking-[-0.33px]
          transition-colors duration-150
          hover:bg-[#F2F2F2] active:bg-[#EBEBEB]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#202020]/20 focus-visible:ring-offset-2
        "
      >
        Explora formas de ganar.
      </Link>
    </div>
  );
}

export function Hero() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-16">
      {/*
        Display type. Cabinet Grotesk is the project's display face but ships
        Regular only, so a 700 weight would be browser-synthesised and smear at
        this size. Plus Jakarta Sans has a true 700 and is already loaded
        globally — closest real match, no new font dependency.
      */}
      <h1
        className="
          font-jakarta font-bold text-[#202020] text-center
          text-[40px] leading-[42px] tracking-[-1.2px]
          sm:text-[56px] sm:leading-[56px] sm:tracking-[-1.68px]
          max-w-[640px]
        "
      >
        Únete al futuro
        <br />
        del trabajo.
      </h1>

      <HeroActions />
    </main>
  );
}
