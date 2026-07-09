"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown, Store, ArrowLeftRight, Plus, Compass, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  businessId: string;
  businessName: string;
  logoUrl?: string | null;
}

// Split-card faces share this hairline + soft drop shadow so the two halves
// read as a single card. The -1px overlap on the right button collapses the
// seam to a single crisp line (no doubled/thick border).
const CARD_SHADOW =
  "inset 0 0 0 1px rgba(0,0,0,0.122), 0 1px 2px rgba(0,0,0,0.05)";

function Avatar({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  if (logoUrl) {
    // Plain <img>: business logos are remote (Supabase) URLs, avoiding
    // next/image domain config.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logoUrl}
        alt={name}
        width={32}
        height={32}
        className="w-8 h-8 shrink-0 object-cover"
        style={{ borderRadius: "max(25%, 0px)" }}
      />
    );
  }
  return (
    <div
      className="w-8 h-8 shrink-0 flex items-center justify-center bg-[#f2f2f2] text-[13px] font-semibold text-[#636363]"
      style={{ borderRadius: "max(25%, 0px)" }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/**
 * Business switcher trigger — a Whop-style split card:
 *   • left half is a real <a> to the current business dashboard
 *   • right half is a chevron button that opens the change-business menu
 * The menu content (current business / ver comunidad / cambiar negocio /
 * nuevo negocio / descubre negocios) lives entirely inside this component.
 */
export function BusinessSwitcher({ businessId, businessName, logoUrl }: Props) {
  const base = `/mis-negocios/${businessId}`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex items-stretch w-full shrink-0">
      {/* Left — link to the current business dashboard */}
      <Link
        href={base}
        className={cn(
          "flex items-center justify-start gap-2 p-2 min-w-0 flex-1 h-12",
          "bg-white transition-colors duration-150 cursor-pointer",
          "hover:bg-[#fafafa]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:z-10 focus-visible:relative"
        )}
        style={{ boxShadow: CARD_SHADOW, borderRadius: "8px 0 0 8px" }}
      >
        <Avatar name={businessName} logoUrl={logoUrl} />
        <span
          className="min-w-0 truncate"
          style={{
            fontFamily:
              'Inter, -apple-system, system-ui, Roboto, "Helvetica Neue", sans-serif',
            fontSize: "16px",
            fontWeight: 500,
            lineHeight: "24px",
            letterSpacing: "-0.18px",
            color: "#202020",
          }}
        >
          {businessName}
        </span>
      </Link>

      {/* Right — chevron button that opens the switcher menu (does not navigate) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Cambiar negocio"
        className={cn(
          "w-12 h-12 shrink-0 flex items-center justify-center -ml-px",
          "bg-white transition-colors duration-150 cursor-pointer",
          "hover:bg-[#fafafa]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:z-10 focus-visible:relative"
        )}
        style={{ boxShadow: CARD_SHADOW, borderRadius: "0 8px 8px 0" }}
      >
        <ChevronDown
          className={cn(
            "w-4 h-4 text-[#636363] transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-[240px] rounded-[10px] bg-white p-1"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.4px] text-black/40">
            Negocio actual
          </p>
          <MenuLink href={base} onNavigate={() => setOpen(false)}>
            <Avatar name={businessName} logoUrl={logoUrl} />
            <span className="min-w-0 truncate text-[14px] font-medium text-[#202020]">
              {businessName}
            </span>
            <Check className="w-4 h-4 shrink-0 ml-auto text-brand-500" />
          </MenuLink>

          <div className="my-1 h-px bg-black/5" />

          <MenuLink href={`/business/${businessId}`} onNavigate={() => setOpen(false)}>
            <MenuIcon icon={Store} />
            Ver comunidad
          </MenuLink>
          <MenuLink href="/mis-negocios" onNavigate={() => setOpen(false)}>
            <MenuIcon icon={ArrowLeftRight} />
            Cambiar negocio
          </MenuLink>
          <MenuLink href="/crear" onNavigate={() => setOpen(false)}>
            <MenuIcon icon={Plus} />
            Nuevo negocio
          </MenuLink>
          <MenuLink href="/descubrir" onNavigate={() => setOpen(false)}>
            <MenuIcon icon={Compass} />
            Descubre negocios
          </MenuLink>
        </div>
      )}
    </div>
  );
}

function MenuIcon({ icon: Icon }: { icon: React.ElementType }) {
  return <Icon className="w-[18px] h-[18px] shrink-0 text-[#636363]" />;
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 px-2.5 h-9 w-full rounded-[7px]",
        "text-[14px] font-medium text-[#202020]",
        "transition-colors duration-150 cursor-pointer select-none",
        "hover:bg-[#fafafa]",
        "focus-visible:outline-none focus-visible:bg-[#fafafa]"
      )}
    >
      {children}
    </Link>
  );
}
