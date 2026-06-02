"use client";

import { useState, useTransition } from "react";
import {
  followUser,
  unfollowUser,
} from "@/app/(dashboard)/inicio/actions";
import { RealPostCard } from "@/components/dashboard/inicio/real-post-card";
import type { UserProfile } from "./actions";
import { FileText, Users } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-orange-500",
  "bg-pink-600",  "bg-teal-600",  "bg-indigo-600",  "bg-amber-600",
];

function avatarColor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const COVER_GRADIENTS = [
  "from-blue-100 to-indigo-50",
  "from-purple-100 to-fuchsia-50",
  "from-emerald-100 to-teal-50",
  "from-orange-100 to-amber-50",
  "from-pink-100 to-rose-50",
  "from-teal-100 to-cyan-50",
  "from-indigo-100 to-purple-50",
  "from-amber-100 to-yellow-50",
];

function coverGradient(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return COVER_GRADIENTS[h % COVER_GRADIENTS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CurrentUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
}

interface Props {
  profile: UserProfile;
  currentUser: CurrentUser | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UserProfileClient({ profile, currentUser }: Props) {
  const [isFollowing, setIsFollowing]       = useState(profile.is_following);
  const [followersCount, setFollowersCount] = useState(profile.followers_count);
  const [, startTransition]                 = useTransition();

  const bg    = avatarColor(profile.user_id);
  const cover = coverGradient(profile.user_id);

  function handleFollow() {
    setIsFollowing(true);
    setFollowersCount((c) => c + 1);
    startTransition(async () => {
      const result = await followUser(profile.user_id);
      if (result.error) {
        setIsFollowing(false);
        setFollowersCount((c) => c - 1);
      }
    });
  }

  function handleUnfollow() {
    setIsFollowing(false);
    setFollowersCount((c) => Math.max(0, c - 1));
    startTransition(async () => {
      const result = await unfollowUser(profile.user_id);
      if (result.error) {
        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
      }
    });
  }

  const currentUserForCard = currentUser
    ? { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl }
    : null;

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto pb-10">

        {/* ── Cover + header card ── */}
        <div className="bg-white border-b border-gray-200 shadow-sm">

          {/* Cover */}
          <div className={`h-28 sm:h-36 bg-gradient-to-br ${cover}`} />

          {/* Avatar + actions row */}
          <div className="px-5 sm:px-6 flex items-end justify-between -mt-10 sm:-mt-12 mb-4">
            {/* Avatar */}
            <div className="ring-4 ring-white rounded-full shrink-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                />
              ) : (
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold ${bg}`}
                >
                  {initials(profile.display_name)}
                </div>
              )}
            </div>

            {/* Follow / Own profile */}
            <div className="mb-1">
              {profile.is_own_profile ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-500">
                  Este es tu perfil
                </span>
              ) : isFollowing ? (
                <button
                  onClick={handleUnfollow}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  Siguiendo
                </button>
              ) : (
                <button
                  onClick={handleFollow}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Seguir
                </button>
              )}
            </div>
          </div>

          {/* Name + bio + stats */}
          <div className="px-5 sm:px-6 pb-5 space-y-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                {profile.display_name}
              </h1>
              {profile.username && (
                <p className="text-xs font-medium text-gray-400 mt-0.5">
                  @{profile.username}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">{profile.bio}</p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{fmtCount(profile.posts_count)}</span>
                <span className="text-gray-500 text-xs">publicaciones</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{fmtCount(followersCount)}</span>
                <span className="text-gray-500 text-xs">seguidores</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <span className="font-semibold">{fmtCount(profile.following_count)}</span>
                <span className="text-gray-500 text-xs">siguiendo</span>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="px-5 sm:px-6 border-t border-gray-100 flex">
            <button className="py-3 text-sm font-semibold text-gray-900 border-b-2 border-gray-900 -mb-px">
              Publicaciones
            </button>
          </div>
        </div>

        {/* ── Posts feed ── */}
        <div className="px-4 sm:px-0 pt-4 space-y-4">
          {profile.posts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-16 flex flex-col items-center gap-4 text-center px-8">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Sin publicaciones todavía
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                  {profile.posts_count === 0 && !profile.avatar_url
                    ? "Este perfil todavía no tiene actividad pública."
                    : "Cuando este usuario publique algo, aparecerá aquí."}
                </p>
              </div>
            </div>
          ) : (
            profile.posts.map((post) => (
              <RealPostCard
                key={post.id}
                post={post}
                currentUser={currentUserForCard}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
}
