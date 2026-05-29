"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  BarChart2,
  Share2,
  MoreHorizontal,
  Image as ImageIcon,
  Film,
  Smile,
  DollarSign,
  Radio,
  Star,
  UserPlus,
  UserCheck,
  X,
  Terminal,
  Copy,
  Send,
  AlertCircle,
} from "lucide-react";
import {
  createFeedPost,
  followUser,
  unfollowUser,
} from "@/app/(dashboard)/inicio/actions";
import type {
  FeedPost,
  FeedBusiness,
  FeedCreator,
} from "@/app/(dashboard)/inicio/actions";
import { RealPostCard } from "@/components/dashboard/inicio/real-post-card";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CurrentUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
}

interface Props {
  initialPosts: FeedPost[];
  tableExists: boolean;
  fetchError?: string;
  migrationSQL: string;
  currentUser: CurrentUser | null;
  userBusinesses: FeedBusiness[];
  creators: FeedCreator[];
  followedUserIds: string[];
}

// ── Static mock data (right panel + example posts when table is empty) ─────────

interface MockPost {
  id: string;
  author: { name: string; handle: string; initials: string; color: string };
  channel: string;
  timeAgo: string;
  text: string;
  poll?: { options: string[]; votes: number };
  card?: {
    title: string;
    description: string;
    metric?: string;
    price?: string;
    cta: string;
    ctaStyle?: "brand" | "outline";
    badge?: string;
  };
  stats: { likes: number; comments: number; views: number };
}

const MOCK_POSTS: MockPost[] = [
  {
    id: "mock-1",
    author: { name: "Mundo Academy", handle: "@mundoacademy", initials: "MA", color: "bg-blue-600" },
    channel: "Public forum",
    timeAgo: "1d",
    text: "¿Cuánto facturaste este mes con tu negocio digital?",
    poll: { options: ["$0", "$100+", "$1,000+", "$10,000+"], votes: 1401 },
    stats: { likes: 31, comments: 36, views: 48157 },
  },
  {
    id: "mock-2",
    author: { name: "Venture AI", handle: "@ventureai", initials: "VA", color: "bg-purple-600" },
    channel: "Actualizaciones",
    timeAgo: "6h",
    text: "Nuevo diagnóstico semanal disponible: identifica tus 3 acciones prioritarias para crecer esta semana.",
    card: {
      title: "Venture AI Business Diagnostic",
      description: "CFO + CMO + strategist para emprendedores digitales hispanohablantes",
      metric: "4.9 ★ · 2.1k usuarios",
      cta: "Abrir diagnóstico",
      ctaStyle: "brand",
      badge: "IA",
    },
    stats: { likes: 24, comments: 12, views: 8320 },
  },
  {
    id: "mock-3",
    author: { name: "Mundo Ejecutivo", handle: "@mundoejecutivo", initials: "ME", color: "bg-emerald-600" },
    channel: "Cursos",
    timeAgo: "2d",
    text: "Nueva masterclass disponible: cómo construir una marca de autoridad en mercados hispanohablantes.",
    card: {
      title: "Marca de Autoridad Latam",
      description: "Masterclass · 4 módulos · Acceso inmediato",
      price: "$49",
      cta: "Ver curso",
      ctaStyle: "brand",
      badge: "Nuevo",
    },
    stats: { likes: 87, comments: 43, views: 21045 },
  },
  {
    id: "mock-4",
    author: { name: "Founder Network", handle: "@foundernetwork", initials: "FN", color: "bg-orange-500" },
    channel: "Oportunidades",
    timeAgo: "3d",
    text: "Buscamos founders con MRR superior a $500 para el próximo demo day privado. Cupos limitados.",
    card: {
      title: "Demo Day Privado — Q3 2026",
      description: "Pitch ante inversores · Aplicaciones cierran el 15 de junio",
      cta: "Aplicar ahora",
      ctaStyle: "outline",
      badge: "Inversión",
    },
    stats: { likes: 156, comments: 92, views: 64200 },
  },
];


// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtViews(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "ahora";
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

/** Deterministic Tailwind bg color from a string hash */
const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-orange-500",
  "bg-pink-600",  "bg-teal-600",  "bg-indigo-600",  "bg-amber-600",
];
function avatarColor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// ── Main component ────────────────────────────────────────────────────────────

type FilterTab = "todo" | "siguiendo" | "mis-negocios";

export function InicioFeed({
  initialPosts,
  tableExists,
  fetchError,
  migrationSQL,
  currentUser,
  userBusinesses,
  creators,
  followedUserIds,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("todo");
  const [sqlCopied, setSqlCopied] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(
    () => new Set(followedUserIds)
  );
  const [, startFollowTransition] = useTransition();

  const showMigrationBanner = !tableExists;
  const showMockExamples = !tableExists;

  // Client-side filter
  const filteredPosts = initialPosts.filter((p) => {
    if (activeFilter === "siguiendo") return followedIds.has(p.user_id);
    if (activeFilter === "mis-negocios") return p.business_id !== null;
    return true;
  });

  const hasRealPosts = tableExists && filteredPosts.length > 0;

  function copySql() {
    navigator.clipboard.writeText(migrationSQL).then(() => {
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    });
  }

  function handleFollow(targetUserId: string) {
    setFollowedIds((prev) => new Set([...prev, targetUserId]));
    startFollowTransition(async () => {
      const result = await followUser(targetUserId);
      if (result.error) {
        setFollowedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      }
    });
  }

  function handleUnfollow(targetUserId: string) {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      next.delete(targetUserId);
      return next;
    });
    startFollowTransition(async () => {
      const result = await unfollowUser(targetUserId);
      if (result.error) {
        setFollowedIds((prev) => new Set([...prev, targetUserId]));
      }
    });
  }

  const currentUserForCard = currentUser
    ? { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl }
    : null;

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex gap-6">

        {/* ── Center feed ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Header + filter tabs */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Inicio</h1>
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1">
              {(
                [
                  { key: "todo",       label: "Todo"       },
                  { key: "siguiendo",  label: "Siguiendo"  },
                  { key: "mis-negocios", label: "Mis negocios" },
                ] as { key: FilterTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === tab.key
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Migration banner */}
          {showMigrationBanner && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Terminal className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Migración requerida</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    La tabla <code className="font-mono">feed_posts</code> no existe aún.
                    Ejecuta este SQL en Supabase → SQL Editor para activar el feed real.
                  </p>
                </div>
              </div>
              <div className="relative">
                <pre className="text-xs font-mono bg-white border border-amber-200 rounded-lg p-3 overflow-x-auto text-gray-700 leading-relaxed">
                  {migrationSQL}
                </pre>
                <button
                  onClick={copySql}
                  className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  {sqlCopied ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          {/* Composer */}
          <Composer
            currentUser={currentUser}
            tableExists={tableExists}
            userBusinesses={userBusinesses}
          />

          {/* Fetch error */}
          {fetchError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-900">Error al cargar el feed</p>
                <p className="text-xs text-red-700 mt-0.5">{fetchError}</p>
              </div>
            </div>
          )}

          {/* ── Real posts ── */}
          {hasRealPosts && (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <RealPostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUserForCard}
                />
              ))}
            </div>
          )}

          {/* ── Empty state: table exists but nothing to show ── */}
          {tableExists && !fetchError && filteredPosts.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 py-16 flex flex-col items-center gap-5 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-100 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-blue-400" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold text-gray-900">
                  {activeFilter === "siguiendo"
                    ? "No sigues a nadie todavía"
                    : activeFilter === "mis-negocios"
                      ? "Esta comunidad todavía no tiene publicaciones"
                      : "Todavía no hay publicaciones"}
                </p>
                <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                  {activeFilter === "siguiendo"
                    ? "Sigue a creadores para ver sus publicaciones aquí."
                    : activeFilter === "mis-negocios"
                      ? "Publica algo en uno de tus negocios para que aparezca aquí."
                      : "Sé el primero en compartir una actualización, pregunta o recurso con la comunidad de Mundo Academy."}
                </p>
              </div>
              {activeFilter === "siguiendo" ? (
                <button
                  type="button"
                  onClick={() => {
                    const panel = document.getElementById("creators-panel");
                    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Descubrir creadores
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const ta = document.querySelector<HTMLTextAreaElement>("textarea");
                    ta?.focus();
                    ta?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                  Crear primera publicación
                </button>
              )}
            </div>
          )}

          {/* Mock posts — only when table doesn't exist */}
          {showMockExamples && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1">
                Publicaciones de ejemplo
              </p>
              {MOCK_POSTS.map((post) => (
                <MockPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* ── Right panel ─────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 space-y-4 hidden xl:block">
          <CreatorsPanel
            creators={creators}
            followedIds={followedIds}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
          />
        </div>

      </div>
    </div>
  );
}

// ── Composer (functional) ─────────────────────────────────────────────────────

function Composer({
  currentUser,
  tableExists,
  userBusinesses,
}: {
  currentUser: CurrentUser | null;
  tableExists: boolean;
  userBusinesses: FeedBusiness[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Can't post until the table exists
  const disabled = !tableExists;

  const selectedBizName =
    selectedBusinessId !== null
      ? (userBusinesses.find((b) => b.id === selectedBusinessId)?.name ?? "Negocio")
      : "Mundo Academy";

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar 5 MB");
      return;
    }
    setError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!content.trim() && !imageFile) {
      setError("Escribe algo o adjunta una imagen");
      return;
    }

    const fd = new FormData();
    fd.set("content", content);
    fd.set("business_id", selectedBusinessId ?? "");
    if (imageFile) fd.set("image", imageFile);

    startTransition(async () => {
      const result = await createFeedPost(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Reset form
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setSelectedBusinessId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Refresh server component to get new posts
      router.refresh();
    });
  }

  const avatarBg = currentUser
    ? avatarColor(currentUser.id)
    : "bg-blue-600";
  const avatarLabel = currentUser?.initials ?? "MA";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3"
    >
      {/* "Publicar en" selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Publicar en</span>
        {userBusinesses.length === 0 ? (
          // No businesses — fixed to Mundo Academy
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700">
            <span className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-white font-bold leading-none text-[8px]">
              MA
            </span>
            Mundo Academy
          </span>
        ) : (
          // Dropdown selector
          <select
            value={selectedBusinessId ?? ""}
            onChange={(e) =>
              setSelectedBusinessId(e.target.value || null)
            }
            disabled={disabled || isPending}
            className="text-xs font-medium text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Mundo Academy</option>
            {userBusinesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs text-gray-400 hidden sm:inline">·</span>
        <span className="text-xs text-gray-500 hidden sm:inline font-medium">
          {selectedBizName}
        </span>
      </div>

      {/* Text input */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold mt-0.5 ${avatarBg}`}
        >
          {avatarLabel}
        </div>
        <textarea
          rows={2}
          placeholder={disabled ? "Ejecuta la migración para activar el feed…" : "Di algo a la comunidad…"}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isPending || disabled}
          className="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-transparent resize-none outline-none leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 ml-11">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="preview"
            className="max-h-48 w-full object-cover"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200 ml-11">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-0.5">
          {/* Image upload */}
          <button
            type="button"
            title="Imagen"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          {[
            { icon: Film,       label: "GIF" },
            { icon: Smile,      label: "Emoji" },
            { icon: BarChart2,  label: "Encuesta" },
            { icon: DollarSign, label: "Monetizar" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              title={label}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
          >
            <Radio className="w-3.5 h-3.5" />
            Activar en vivo
          </button>
          <button
            type="submit"
            disabled={disabled || isPending || (!content.trim() && !imageFile)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Publicando…
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Publicar
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

// RealPostCard is in src/components/dashboard/inicio/real-post-card.tsx

// ── Mock post card (example / placeholder posts) ──────────────────────────────

function MockPostCard({ post }: { post: MockPost }) {
  const [liked, setLiked] = useState(false);
  return (
    <article className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
      <div className="px-5 pt-4 pb-0 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${post.author.color}`}>
            {post.author.initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{post.author.name}</span>
              <span className="text-xs text-gray-400">↗</span>
              <span className="text-xs text-gray-500">{post.channel}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{post.author.handle} · {post.timeAgo}</p>
          </div>
        </div>
        <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-gray-800 leading-relaxed">{post.text}</p>
        {post.poll && <PollBlock poll={post.poll} />}
        {post.card && <EmbedCardBlock card={post.card} />}
      </div>

      <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-4">
        <ActionBtn icon={Heart} count={post.stats.likes + (liked ? 1 : 0)} label="Me gusta" active={liked} activeClass="text-red-500" onClick={() => setLiked((v) => !v)} />
        <ActionBtn icon={MessageCircle} count={post.stats.comments} label="Comentar" />
        <ActionBtn icon={BarChart2} count={post.stats.views} label="Vistas" formatter={fmtViews} />
        <button className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Compartir">
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
}

// ── Poll block ────────────────────────────────────────────────────────────────

function PollBlock({ poll }: { poll: { options: string[]; votes: number } }) {
  const [voted, setVoted] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {poll.options.map((opt, i) => (
        <button
          key={i}
          onClick={() => setVoted(i)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium text-left transition-colors ${
            voted === i
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100"
          }`}
        >
          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${voted === i ? "border-blue-600" : "border-gray-300"}`}>
            {voted === i && <span className="w-2 h-2 rounded-full bg-blue-600 block" />}
          </span>
          {opt}
        </button>
      ))}
      <p className="text-xs text-gray-400 pt-0.5">{poll.votes.toLocaleString()} votos</p>
    </div>
  );
}

// ── Embed card block ──────────────────────────────────────────────────────────

function EmbedCardBlock({
  card,
}: {
  card: {
    title: string;
    description: string;
    metric?: string;
    price?: string;
    cta: string;
    ctaStyle?: "brand" | "outline";
    badge?: string;
  };
}) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {card.badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 uppercase tracking-wide">
                {card.badge}
              </span>
            )}
            <p className="text-sm font-semibold text-gray-900">{card.title}</p>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{card.description}</p>
          {card.metric && (
            <div className="flex items-center gap-1.5 mt-2">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs text-gray-500">{card.metric}</span>
            </div>
          )}
          {card.price && <p className="text-sm font-bold text-gray-900 mt-2">{card.price}</p>}
        </div>
      </div>
      <div className="px-4 pb-4">
        <button className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
          card.ctaStyle === "brand"
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}>
          {card.cta}
        </button>
      </div>
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({
  icon: Icon, count, label, active, activeClass, onClick, formatter,
}: {
  icon: React.ElementType;
  count: number;
  label: string;
  active?: boolean;
  activeClass?: string;
  onClick?: () => void;
  formatter?: (n: number) => string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors rounded-lg px-2 py-1.5 hover:bg-gray-100 ${
        active ? activeClass : "text-gray-500 hover:text-gray-800"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {formatter ? formatter(count) : count}
    </button>
  );
}

// ── Creators panel ────────────────────────────────────────────────────────────

function CreatorsPanel({
  creators,
  followedIds,
  onFollow,
  onUnfollow,
}: {
  creators: FeedCreator[];
  followedIds: Set<string>;
  onFollow: (uid: string) => void;
  onUnfollow: (uid: string) => void;
}) {
  if (creators.length === 0) return null;

  return (
    <div id="creators-panel" className="bg-white rounded-2xl border border-gray-200">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Usuarios populares</p>
        <button className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
          Ver todo
        </button>
      </div>

      {/* List */}
      <ul className="pb-2">
        {creators.map((c) => {
          const isFollowing = followedIds.has(c.user_id);
          const label = initials(c.name);
          const bg = avatarColor(c.user_id);

          return (
            <li key={c.user_id} className="px-4 py-2.5 flex items-center gap-3">
              {/* Avatar */}
              <div className="relative shrink-0">
                {c.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.avatar_url}
                    alt={c.name ?? ""}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${bg}`}
                  >
                    {label}
                  </div>
                )}
              </div>

              {/* Name + context */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                  {c.name ?? "Usuario"}
                </p>
                <p className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">
                  {c.display_context}
                </p>
              </div>

              {/* Follow / Unfollow button — always visible */}
              {isFollowing ? (
                <button
                  onClick={() => onUnfollow(c.user_id)}
                  className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-500 bg-white hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  Siguiendo
                </button>
              ) : (
                <button
                  onClick={() => onFollow(c.user_id)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 text-[11px] font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Seguir
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
