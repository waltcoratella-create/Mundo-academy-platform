import Link from "next/link";
import Image from "next/image";

/**
 * Public header for the landing. Deliberately NOT the dashboard TopBar — that
 * one carries sidebar/AI/messages/notification state we don't want out here.
 *
 * "Para empresas" and "API" have no destinations yet, so they render as inert
 * styled text rather than links to nowhere. Swap them for <Link> once those
 * pages exist.
 */
const NAV_PLACEHOLDERS = ["Para empresas", "API"];

export function PublicHeader({ isAuthed }: { isAuthed: boolean }) {
  return (
    <header className="h-16 shrink-0 bg-white border-b border-[#ededed]">
      <div className="h-full max-w-[1400px] mx-auto px-5 sm:px-8 flex items-center justify-between gap-4">
        {/* Logo — the real asset, same one the dashboard TopBar uses */}
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Mundo Academy">
          <Image
            src="/logos/mundo-academy-logo.svg"
            alt="Mundo Academy"
            width={32}
            height={32}
            priority
            unoptimized
            className="h-8 w-auto"
          />
          <span className="hidden sm:block text-[18px] font-semibold tracking-[-0.3px] text-[#202020]">
            Mundo Academy
          </span>
        </Link>

        <nav className="flex items-center gap-5 sm:gap-8">
          {NAV_PLACEHOLDERS.map((label) => (
            <span
              key={label}
              className="hidden sm:block text-[15px] font-normal text-[#5c5c5c] select-none"
            >
              {label}
            </span>
          ))}

          {isAuthed ? (
            <Link
              href="/mis-negocios"
              className="text-[15px] font-normal text-[#5c5c5c] hover:text-[#202020] transition-colors"
            >
              Ir a mi panel
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="text-[15px] font-normal text-[#5c5c5c] hover:text-[#202020] transition-colors"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
