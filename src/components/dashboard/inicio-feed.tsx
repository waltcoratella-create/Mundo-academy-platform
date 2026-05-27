"use client";

import { useState } from "react";
import {
  Heart,
  MessageCircle,
  BarChart2,
  Share2,
  MoreHorizontal,
  Image,
  Film,
  Smile,
  DollarSign,
  Radio,
  ChevronDown,
  Star,
  Users,
  TrendingUp,
  UserPlus,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Author {
  name: string;
  handle: string;
  initials: string;
  color: string;
}

interface PostStats {
  likes: number;
  comments: number;
  views: number;
}

interface Poll {
  options: string[];
  votes: number;
}

interface EmbedCard {
  title: string;
  description: string;
  metric?: string;
  price?: string;
  cta: string;
  ctaStyle?: "brand" | "outline";
  badge?: string;
}

interface Post {
  id: string;
  author: Author;
  channel: string;
  timeAgo: string;
  text: string;
  poll?: Poll;
  card?: EmbedCard;
  stats: PostStats;
}

interface Creator {
  name: string;
  description: string;
  initials: string;
  color: string;
  online?: boolean;
}

interface Community {
  name: string;
  members: string;
  emoji: string;
  color: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_POSTS: Post[] = [
  {
    id: "1",
    author: {
      name: "Mundo Academy",
      handle: "@mundoacademy",
      initials: "MA",
      color: "bg-blue-600",
    },
    channel: "Public forum",
    timeAgo: "1d",
    text: "¿Cuánto facturaste este mes con tu negocio digital?",
    poll: {
      options: ["$0", "$100+", "$1,000+", "$10,000+"],
      votes: 1401,
    },
    stats: { likes: 31, comments: 36, views: 48157 },
  },
  {
    id: "2",
    author: {
      name: "Venture AI",
      handle: "@ventureai",
      initials: "VA",
      color: "bg-purple-600",
    },
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
    id: "3",
    author: {
      name: "Mundo Ejecutivo",
      handle: "@mundoejecutivo",
      initials: "ME",
      color: "bg-emerald-600",
    },
    channel: "Cursos",
    timeAgo: "2d",
    text: "Nueva masterclass disponible: cómo construir una marca de autoridad en mercados hispanohablantes. Más de 4 horas de contenido denso, sin relleno.",
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
    id: "4",
    author: {
      name: "Founder Network",
      handle: "@foundernetwork",
      initials: "FN",
      color: "bg-orange-500",
    },
    channel: "Oportunidades",
    timeAgo: "3d",
    text: "Buscamos founders con MRR superior a $500 para el próximo demo day privado. Cupos limitados — solo 12 founders seleccionados.",
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

const MOCK_CREATORS: Creator[] = [
  { name: "Steven Schwartz",  description: "Creador de Whop AI + 39 más",       initials: "SS", color: "bg-red-500",     online: true  },
  { name: "Tiana",            description: "Creadora de Whop University + 1…",  initials: "TI", color: "bg-pink-500",    online: true  },
  { name: "Mundo Ejecutivo",  description: "Branding & autoridad latina",        initials: "ME", color: "bg-emerald-600", online: false },
  { name: "QTT",              description: "Creador de 🚀",                      initials: "QT", color: "bg-yellow-500",  online: true  },
  { name: "Laura Egocheaga",  description: "Creadora de Viral Growth Media",     initials: "LE", color: "bg-teal-500",    online: false },
  { name: "Founder Network",  description: "Startups & Inversión · Latam",      initials: "FN", color: "bg-orange-500",  online: true  },
  { name: "Agency Navigator", description: "Marketing de agencias",              initials: "AN", color: "bg-indigo-600",  online: false },
  { name: "Matthew",          description: "Creador de viral + 1 más",           initials: "MT", color: "bg-amber-500",   online: false },
];

const MOCK_COMMUNITIES: Community[] = [
  { name: "IA & Automatización",  members: "2.4k", emoji: "🤖", color: "bg-purple-100 text-purple-700" },
  { name: "Negocios digitales",   members: "5.1k", emoji: "💼", color: "bg-blue-100 text-blue-700"   },
  { name: "Inversión & Venture",  members: "1.8k", emoji: "📈", color: "bg-green-100 text-green-700" },
  { name: "Marketing & Growth",   members: "3.2k", emoji: "🚀", color: "bg-orange-100 text-orange-700" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtViews(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}

// ── Main feed ─────────────────────────────────────────────────────────────────

type FeedTab = "todo" | "siguiendo" | "unido";

export function InicioFeed() {
  const [activeTab, setActiveTab] = useState<FeedTab>("todo");

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex gap-6">

        {/* ── Center feed ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Header + tabs */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Inicio</h1>
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1">
              {(
                [
                  { key: "todo",      label: "Todo" },
                  { key: "siguiendo", label: "Siguiendo" },
                  { key: "unido",     label: "Unido" },
                ] as { key: FeedTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Composer */}
          <Composer />

          {/* Posts */}
          {MOCK_POSTS.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {/* ── Right panel ── */}
        <div className="w-72 shrink-0 space-y-4 hidden xl:block">
          <CreatorsPanel />
          <CommunitiesPanel />
        </div>

      </div>
    </div>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────────

function Composer() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      {/* Selectors */}
      <div className="flex items-center gap-2">
        <SelectorPill label="Mundo Academy" />
        <SelectorPill label="Public forum" emoji="🌐" />
      </div>

      {/* Input */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white text-xs font-bold mt-0.5">
          MA
        </div>
        <textarea
          rows={2}
          placeholder="Di algo a la comunidad…"
          className="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-transparent resize-none outline-none leading-relaxed"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-0.5">
          {[
            { icon: Image,      label: "Imagen" },
            { icon: Film,       label: "GIF" },
            { icon: Smile,      label: "Emoji" },
            { icon: BarChart2,  label: "Encuesta" },
            { icon: DollarSign, label: "Monetizar" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              title={label}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors">
            <Radio className="w-3.5 h-3.5" />
            Activar en vivo
          </button>
          <button className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectorPill({
  label,
  emoji,
}: {
  label: string;
  emoji?: string;
}) {
  return (
    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors">
      {emoji && <span className="text-sm leading-none">{emoji}</span>}
      {!emoji && (
        <span className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-white font-bold leading-none text-[8px]">
          MA
        </span>
      )}
      {label}
      <ChevronDown className="w-3 h-3 text-gray-400" />
    </button>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);

  return (
    <article className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="px-5 pt-4 pb-0 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${post.author.color}`}
          >
            {post.author.initials}
          </div>
          {/* Author info */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">
                {post.author.name}
              </span>
              <span className="text-xs text-gray-400">↗</span>
              <span className="text-xs text-gray-500">{post.channel}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {post.author.handle} · {post.timeAgo}
            </p>
          </div>
        </div>
        <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-gray-800 leading-relaxed">{post.text}</p>

        {/* Poll */}
        {post.poll && <PollBlock poll={post.poll} />}

        {/* Embed card */}
        {post.card && <EmbedCardBlock card={post.card} />}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-4">
        <ActionBtn
          icon={Heart}
          count={post.stats.likes + (liked ? 1 : 0)}
          label="Me gusta"
          active={liked}
          activeClass="text-red-500"
          onClick={() => setLiked((v) => !v)}
        />
        <ActionBtn
          icon={MessageCircle}
          count={post.stats.comments}
          label="Comentar"
        />
        <ActionBtn
          icon={BarChart2}
          count={post.stats.views}
          label="Vistas"
          formatter={fmtViews}
        />
        <button
          className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Compartir"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
}

// ── Poll block ────────────────────────────────────────────────────────────────

function PollBlock({ poll }: { poll: Poll }) {
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
          <span
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
              voted === i ? "border-blue-600" : "border-gray-300"
            }`}
          >
            {voted === i && (
              <span className="w-2 h-2 rounded-full bg-blue-600 block" />
            )}
          </span>
          {opt}
        </button>
      ))}
      <p className="text-xs text-gray-400 pt-0.5">
        {poll.votes.toLocaleString()} votos
      </p>
    </div>
  );
}

// ── Embed card block ──────────────────────────────────────────────────────────

function EmbedCardBlock({ card }: { card: EmbedCard }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Card inner */}
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
          {card.price && (
            <p className="text-sm font-bold text-gray-900 mt-2">{card.price}</p>
          )}
        </div>
      </div>
      {/* CTA */}
      <div className="px-4 pb-4">
        <button
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            card.ctaStyle === "brand"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          {card.cta}
        </button>
      </div>
    </div>
  );
}

// ── Post action button ────────────────────────────────────────────────────────

function ActionBtn({
  icon: Icon,
  count,
  label,
  active,
  activeClass,
  onClick,
  formatter,
}: {
  icon: React.ElementType;
  count: number;
  label: string;
  active?: boolean;
  activeClass?: string;
  onClick?: () => void;
  formatter?: (n: number) => string;
}) {
  const display = formatter ? formatter(count) : String(count);
  return (
    <button
      onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors rounded-lg px-2 py-1.5 hover:bg-gray-100 ${
        active ? activeClass : "text-gray-500 hover:text-gray-800"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {display}
    </button>
  );
}

// ── Creators panel ────────────────────────────────────────────────────────────

function CreatorsPanel() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Creadores populares</p>
        <button className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
          Ver todo
        </button>
      </div>

      {/* List */}
      <ul className="divide-y divide-gray-50">
        {MOCK_CREATORS.map((creator) => (
          <li key={creator.name} className="px-5 py-3 flex items-center gap-3 group">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${creator.color}`}
              >
                {creator.initials}
              </div>
              {creator.online && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {creator.name}
              </p>
              <p className="text-[10px] text-gray-400 truncate">
                {creator.description}
              </p>
            </div>

            {/* Follow button */}
            <button className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-[10px] font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors opacity-0 group-hover:opacity-100">
              <UserPlus className="w-3 h-3" />
              Seguir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Communities panel ─────────────────────────────────────────────────────────

function CommunitiesPanel() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Comunidades destacadas</p>
      </div>

      {/* List */}
      <ul className="divide-y divide-gray-50">
        {MOCK_COMMUNITIES.map((c) => (
          <li key={c.name} className="px-5 py-3 flex items-center gap-3">
            {/* Emoji avatar */}
            <span
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-base ${c.color}`}
            >
              {c.emoji}
            </span>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {c.name}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Users className="w-3 h-3 text-gray-400" />
                <p className="text-[10px] text-gray-400">{c.members} miembros</p>
              </div>
            </div>

            {/* Trend icon */}
            <TrendingUp className="w-3.5 h-3.5 text-gray-300 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}
