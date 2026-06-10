"use client";

import { useState, useEffect } from "react";
import {
  Globe, Calendar, AlignLeft, Instagram, Linkedin, Twitter,
  Youtube, Music2, Users, LinkIcon,
} from "lucide-react";
import { getBusinessAbout } from "./about-actions";
import type { BusinessAboutData, AboutTeamMember } from "./about-actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
  });
}

// ─── MemberCard ───────────────────────────────────────────────────────────────

function MemberCard({ member }: { member: AboutTeamMember }) {
  const initials = (member.name ?? member.username ?? "?").charAt(0).toUpperCase();
  const isOwner = member.role === "owner";

  return (
    <div className="flex items-center gap-3 p-4 bg-white border border-black/[0.07] rounded-2xl">
      {/* Avatar */}
      {member.avatar_url ? (
        <img
          src={member.avatar_url}
          alt={member.name ?? ""}
          className="w-14 h-14 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center shrink-0 select-none">
          <span className="text-[18px] font-bold text-gray-500">{initials}</span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold leading-[22px] text-[#202020] truncate">
          {member.name ?? (member.username ? `@${member.username}` : "Usuario")}
        </p>
        {member.username && (
          <p className="text-[13px] text-[rgba(0,0,0,0.45)] truncate leading-[18px]">
            @{member.username}
          </p>
        )}
        <span
          className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-[0.2px] ${
            isOwner
              ? "bg-[#202020] text-white"
              : "bg-gray-100 text-[rgba(0,0,0,0.55)]"
          }`}
        >
          {isOwner ? "Fundador" : "Miembro"}
        </span>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function AboutSkeleton() {
  return (
    <div className="space-y-8">
      {/* Team skeleton */}
      <section>
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-white border border-black/[0.07] rounded-2xl">
              <Skeleton className="w-14 h-14 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Info skeleton */}
      <section>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="bg-white border border-black/[0.07] rounded-2xl p-5 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </section>
    </div>
  );
}

// ─── BusinessAbout ────────────────────────────────────────────────────────────

interface Props {
  businessId: string;
}

export function BusinessAbout({ businessId }: Props) {
  const [data, setData]       = useState<BusinessAboutData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBusinessAbout(businessId).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [businessId]);

  if (loading) return <AboutSkeleton />;

  const team = data?.team ?? [];
  const info = data?.info ?? { description: null, website: null, created_at: null };

  const hasDescription = !!info.description?.trim();
  const hasWebsite     = !!info.website?.trim();
  const hasCreatedAt   = !!info.created_at;
  const hasAnyInfo     = hasDescription || hasWebsite || hasCreatedAt;

  const formattedDate = formatDate(info.created_at);

  return (
    <div className="space-y-8 max-w-3xl">

      {/* ── Equipo ───────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-[18px] h-[18px] text-[rgba(0,0,0,0.45)]" />
          <h3 className="text-[16px] font-bold leading-[22px] text-[#202020]">Equipo</h3>
          {team.length > 0 && (
            <span className="text-[13px] text-[rgba(0,0,0,0.35)] font-normal">
              {team.length} {team.length === 1 ? "persona" : "personas"}
            </span>
          )}
        </div>

        {team.length === 0 ? (
          <div className="bg-white border border-black/[0.07] rounded-2xl py-10 flex flex-col items-center gap-2 text-center">
            <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-[14px] text-[rgba(0,0,0,0.45)]">No hay miembros del equipo todavía.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.map((member) => (
              <MemberCard key={member.clerk_id} member={member} />
            ))}
          </div>
        )}
      </section>

      {/* ── Información ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <AlignLeft className="w-[18px] h-[18px] text-[rgba(0,0,0,0.45)]" />
          <h3 className="text-[16px] font-bold leading-[22px] text-[#202020]">Información</h3>
        </div>

        <div className="bg-white border border-black/[0.07] rounded-2xl divide-y divide-black/[0.05] overflow-hidden">
          {!hasAnyInfo ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <p className="text-[14px] text-[rgba(0,0,0,0.45)]">No se ha añadido información todavía.</p>
            </div>
          ) : (
            <>
              {hasDescription && (
                <div className="flex items-start gap-3 px-5 py-4">
                  <AlignLeft className="w-4 h-4 text-[rgba(0,0,0,0.35)] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium uppercase tracking-[0.3px] text-[rgba(0,0,0,0.40)] mb-1">
                      Descripción
                    </p>
                    <p className="text-[14px] leading-[22px] text-[#202020] whitespace-pre-wrap">
                      {info.description}
                    </p>
                  </div>
                </div>
              )}

              {hasWebsite && (
                <div className="flex items-center gap-3 px-5 py-4">
                  <Globe className="w-4 h-4 text-[rgba(0,0,0,0.35)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium uppercase tracking-[0.3px] text-[rgba(0,0,0,0.40)] mb-1">
                      Sitio web
                    </p>
                    <a
                      href={info.website!.startsWith("http") ? info.website! : `https://${info.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] leading-[20px] text-brand-600 hover:underline truncate block"
                    >
                      {info.website}
                    </a>
                  </div>
                </div>
              )}

              {hasCreatedAt && (
                <div className="flex items-center gap-3 px-5 py-4">
                  <Calendar className="w-4 h-4 text-[rgba(0,0,0,0.35)] shrink-0" />
                  <div>
                    <p className="text-[12px] font-medium uppercase tracking-[0.3px] text-[rgba(0,0,0,0.40)] mb-1">
                      Fundado
                    </p>
                    <p className="text-[14px] leading-[20px] text-[#202020]">{formattedDate}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Redes Sociales ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-[18px] h-[18px] text-[rgba(0,0,0,0.45)]" />
          <h3 className="text-[16px] font-bold leading-[22px] text-[#202020]">Redes Sociales</h3>
        </div>

        {/* Empty state — no social columns in DB yet */}
        <div className="bg-white border border-black/[0.07] rounded-2xl px-5 py-6">
          {/* Platform rows — visual placeholders (greyed out) */}
          <div className="flex flex-col divide-y divide-black/[0.05] mb-5">
            {[
              { Icon: Instagram, label: "Instagram" },
              { Icon: Linkedin,  label: "LinkedIn" },
              { Icon: Twitter,   label: "X (Twitter)" },
              { Icon: Youtube,   label: "YouTube" },
              { Icon: Music2,    label: "TikTok" },
              { Icon: Globe,     label: "Sitio web" },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-3 py-3 opacity-30 select-none">
                <Icon className="w-4 h-4 text-[#202020] shrink-0" />
                <span className="text-[14px] text-[rgba(0,0,0,0.50)]">{label}</span>
                <div className="flex-1 h-px bg-gray-100 mx-2" />
                <span className="text-[13px] text-[rgba(0,0,0,0.30)] italic">—</span>
              </div>
            ))}
          </div>

          <p className="text-center text-[13px] text-[rgba(0,0,0,0.40)] leading-[18px]">
            No se han añadido enlaces todavía.
          </p>
        </div>
      </section>

    </div>
  );
}
