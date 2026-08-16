import { Youtube, Instagram } from "lucide-react";

/**
 * Public footer. Like the header nav, none of these destinations exist yet, so
 * the links render as inert styled text — wire each to a <Link> as its page
 * lands. Icons come from lucide-react (already a dependency); X has no lucide
 * glyph, so it's a small inline path rather than a new icon package.
 */
const LINKS = ["Cómo funciona", "Carreras", "Presionar", "Marca", "Legal", "Estado"];

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

export function PublicFooter() {
  return (
    <footer className="shrink-0 bg-white border-t border-[#ededed]">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {LINKS.map((label) => (
            <span key={label} className="text-[14px] text-[#5c5c5c] select-none">
              {label}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <span
            className="w-9 h-9 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-[#202020]"
            aria-label="YouTube"
          >
            <Youtube className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </span>
          <span
            className="w-9 h-9 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-[#202020]"
            aria-label="X"
          >
            <XIcon className="w-4 h-4" />
          </span>
          <span
            className="w-9 h-9 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-[#202020]"
            aria-label="Instagram"
          >
            <Instagram className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </span>
        </div>
      </div>
    </footer>
  );
}
