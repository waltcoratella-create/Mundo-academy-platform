"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  BarChart2,
  Share2,
  MoreHorizontal,
  Send,
  AlertCircle,
  X,
  CornerDownRight,
} from "lucide-react";
import {
  togglePostLike,
  createPostComment,
  createCommentReply,
  getPostComments,
} from "@/app/(dashboard)/inicio/actions";
import type {
  FeedPost,
  FeedComment,
  FeedReply,
} from "@/app/(dashboard)/inicio/actions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCount(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-orange-500",
  "bg-pink-600",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-amber-600",
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

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({
  url,
  name,
  uid,
  size = "md",
}: {
  url: string | null;
  name: string | null;
  uid: string;
  size?: "xs" | "sm" | "md";
}) {
  const sz =
    size === "xs"
      ? "w-6 h-6 text-[9px]"
      : size === "sm"
      ? "w-7 h-7 text-[10px]"
      : "w-9 h-9 text-xs";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? "Avatar"}
        className={`${sz} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center text-white font-bold shrink-0 ${avatarColor(uid)}`}
    >
      {initials(name)}
    </div>
  );
}

// ── ReplyItem ─────────────────────────────────────────────────────────────────

function ReplyItem({ reply }: { reply: FeedReply }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <Avatar
        url={reply.author_avatar_url}
        name={reply.author_name}
        uid={reply.user_id}
        size="xs"
      />
      <div className="flex-1 min-w-0">
        <div className="bg-black/[0.031] rounded-2xl px-3 py-1.5">
          <p className="text-[11px] font-semibold text-[#202020] leading-none mb-0.5">
            {reply.author_name ?? "Usuario"}
          </p>
          <p className="text-[13px] text-[#202020] leading-relaxed whitespace-pre-wrap">
            {reply.content}
          </p>
        </div>
        <p className="text-[11px] text-black/[0.447] mt-0.5 ml-1">
          {timeAgo(reply.created_at)}
        </p>
      </div>
    </div>
  );
}

// ── CommentItem ───────────────────────────────────────────────────────────────

interface CurrentUserAvatar {
  id: string;
  name: string;
  avatarUrl: string | null;
}

function CommentItem({
  comment,
  postId,
  currentUser,
}: {
  comment: FeedComment;
  postId: string;
  currentUser: CurrentUserAvatar | null;
}) {
  const [replies, setReplies] = useState<FeedReply[]>(comment.recent_replies);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyInput, setReplyInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const replyInputRef = useRef<HTMLInputElement>(null);

  function handleOpenReply() {
    setShowReplyForm(true);
    setTimeout(() => replyInputRef.current?.focus(), 30);
  }

  function handleCancelReply() {
    setShowReplyForm(false);
    setReplyInput("");
    setError(null);
  }

  function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = replyInput.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await createCommentReply(comment.id, postId, trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setReplyInput("");
      setShowReplyForm(false);
      if (result.reply) {
        setReplies((prev) => [...prev, result.reply!]);
      }
    });
  }

  return (
    <div className="flex items-start gap-2.5 py-2 first:pt-0">
      <Avatar
        url={comment.author_avatar_url}
        name={comment.author_name}
        uid={comment.user_id}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        {/* Bubble */}
        <div className="bg-black/[0.031] rounded-2xl px-3 py-2">
          <p className="text-[13px] font-semibold text-[#202020] leading-none mb-0.5">
            {comment.author_name ?? "Usuario"}
          </p>
          <p className="text-[14px] text-[#202020] leading-5 tracking-[-0.08px] whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-1 ml-1">
          <span className="text-[12px] text-black/[0.447]">
            {timeAgo(comment.created_at)}
          </span>
          <button
            type="button"
            onClick={handleOpenReply}
            className="text-[12px] font-semibold text-black/[0.447] hover:text-[#202020] transition-colors"
          >
            Responder
          </button>
        </div>

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-2 pl-3 border-l-2 border-[rgba(0,0,0,0.06)] space-y-0">
            {replies.map((r) => (
              <ReplyItem key={r.id} reply={r} />
            ))}
          </div>
        )}

        {/* Reply form */}
        {showReplyForm && (
          <form
            onSubmit={handleSubmitReply}
            className="flex items-center gap-2 mt-2"
          >
            <CornerDownRight className="w-3.5 h-3.5 text-black/[0.2] shrink-0" />
            {currentUser && (
              <Avatar
                url={currentUser.avatarUrl}
                name={currentUser.name}
                uid={currentUser.id}
                size="xs"
              />
            )}
            <div className="flex-1 flex items-center gap-1.5 bg-black/[0.031] rounded-2xl px-3 py-1.5 border border-[rgba(0,0,0,0.08)] focus-within:border-[rgba(0,0,0,0.2)] transition-colors">
              <input
                ref={replyInputRef}
                type="text"
                placeholder={`Responder a ${comment.author_name ?? "Usuario"}…`}
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                disabled={isPending}
                maxLength={2000}
                className="flex-1 bg-transparent text-[14px] text-[#202020] placeholder-black/[0.447] outline-none disabled:opacity-50 min-w-0 tracking-[-0.08px]"
              />
              {/* Cancel */}
              <button
                type="button"
                onClick={handleCancelReply}
                className="p-0.5 text-black/[0.447] hover:text-[#202020] transition-colors"
                title="Cancelar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {/* Submit */}
              <button
                type="submit"
                disabled={isPending || !replyInput.trim()}
                className="p-0.5 text-[rgb(42,83,208)] hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                title="Enviar respuesta"
              >
                {isPending ? (
                  <span className="w-3.5 h-3.5 border-2 border-[rgba(42,83,208,0.2)] border-t-[rgb(42,83,208)] rounded-full animate-spin block" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </form>
        )}

        {/* Reply error */}
        {error && (
          <div className="flex items-center gap-1.5 text-[12px] text-[rgb(190,60,57)] bg-[rgba(196,59,56,0.075)] rounded-xl px-3 py-1.5 border border-[rgba(196,59,56,0.15)] mt-1.5">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CommentSection ────────────────────────────────────────────────────────────

function CommentSection({
  postId,
  initialComments,
  totalComments,
  currentUser,
}: {
  postId: string;
  initialComments: FeedComment[];
  totalComments: number;
  currentUser: CurrentUserAvatar | null;
}) {
  const [comments, setComments] = useState<FeedComment[]>(initialComments);
  const [allLoaded, setAllLoaded] = useState(
    initialComments.length >= totalComments
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, startLoadMoreTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleLoadMore() {
    startLoadMoreTransition(async () => {
      const result = await getPostComments(postId);
      if (result.error) return;
      setComments(result.comments);
      setAllLoaded(true);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = input.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await createPostComment(postId, trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setInput("");
      if (result.comment) {
        setComments((prev) => [...prev, result.comment!]);
      }
    });
  }

  return (
    <div className="border-t border-[rgba(0,0,0,0.06)] px-5 py-4 space-y-3">
      {/* ── "Ver más comentarios" button ── */}
      {!allLoaded && totalComments > initialComments.length && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-[rgb(42,83,208)] hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {isLoadingMore ? (
            <>
              <span className="w-3 h-3 border-2 border-[rgba(42,83,208,0.2)] border-t-[rgb(42,83,208)] rounded-full animate-spin shrink-0" />
              Cargando…
            </>
          ) : (
            <>
              <MessageCircle className="w-3 h-3" />
              Ver los {totalComments} comentario
              {totalComments !== 1 ? "s" : ""}
            </>
          )}
        </button>
      )}

      {/* ── Comment list ── */}
      {comments.length === 0 ? (
        <p className="text-[14px] text-black/[0.447] text-center py-2 tracking-[-0.08px]">
          Sé el primero en comentar
        </p>
      ) : (
        <div className="space-y-0.5">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={postId}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}

      {/* ── New comment input ── */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {currentUser && (
          <Avatar
            url={currentUser.avatarUrl}
            name={currentUser.name}
            uid={currentUser.id}
            size="sm"
          />
        )}
        <div className="flex-1 flex items-center gap-2 bg-black/[0.031] rounded-2xl px-3 py-2 border border-[rgba(0,0,0,0.08)] focus-within:border-[rgba(0,0,0,0.2)] transition-colors">
          <input
            ref={inputRef}
            type="text"
            placeholder="Escribe un comentario…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isPending}
            maxLength={2000}
            className="flex-1 bg-transparent text-[14px] text-[#202020] placeholder-black/[0.447] outline-none disabled:opacity-50 tracking-[-0.08px]"
          />
          <button
            type="submit"
            disabled={isPending || !input.trim()}
            className="shrink-0 p-1 rounded-full text-[rgb(42,83,208)] hover:bg-black/[0.063] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Enviar comentario"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-[rgba(42,83,208,0.2)] border-t-[rgb(42,83,208)] rounded-full animate-spin block" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Comment error */}
      {error && (
        <div className="flex items-center gap-2 text-[13px] text-[rgb(190,60,57)] bg-[rgba(196,59,56,0.075)] rounded-xl px-3 py-2 border border-[rgba(196,59,56,0.15)]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

// ── RealPostCard ──────────────────────────────────────────────────────────────

interface RealPostCardProps {
  post: FeedPost;
  currentUser: CurrentUserAvatar | null;
}

export function RealPostCard({ post, currentUser }: RealPostCardProps) {
  const [liked, setLiked] = useState(post.liked_by_current_user);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [isPendingLike, startLikeTransition] = useTransition();

  function handleLike() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((c) => c + (wasLiked ? -1 : 1));

    startLikeTransition(async () => {
      const result = await togglePostLike(post.id);
      if (result.error) {
        setLiked(wasLiked);
        setLikesCount((c) => c + (wasLiked ? 1 : -1));
      }
    });
  }

  return (
    <article className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] overflow-hidden hover:border-[rgba(0,0,0,0.15)] transition-colors">
      {/* Header */}
      <div className="px-5 pt-4 pb-0 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link
            href={`/u/${post.user_id}`}
            className="shrink-0 hover:opacity-80 transition-opacity"
          >
            <Avatar
              url={post.author_avatar_url}
              name={post.author_name}
              uid={post.user_id}
            />
          </Link>
          <div>
            <Link
              href={`/u/${post.user_id}`}
              className="text-[15px] font-semibold text-[#202020] hover:underline leading-[21px] tracking-[-0.08px]"
            >
              {post.author_name ?? "Usuario"}
            </Link>
            <p className="text-[14px] text-black/[0.447] mt-0.5 tracking-[-0.08px]">
              {timeAgo(post.created_at)}
              {" · Publicado en "}
              {post.business_id ? (
                <Link
                  href={`/business/${post.business_id}`}
                  className="font-medium text-black/[0.447] hover:text-[#202020] hover:underline transition-colors"
                >
                  {post.business_name ?? "Negocio"}
                </Link>
              ) : (
                <span className="font-medium text-black/[0.447]">Mundo Academy</span>
              )}
            </p>
          </div>
        </div>
        <button className="p-1.5 rounded-full text-black/[0.447] hover:bg-black/[0.063] hover:text-[#202020] transition-colors shrink-0">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {post.content && (
          <p className="text-[15px] text-[#202020] leading-[21px] tracking-[-0.08px] whitespace-pre-wrap">
            {post.content}
          </p>
        )}
        {post.image_url && (
          <div className="rounded-xl overflow-hidden border border-[rgba(0,0,0,0.06)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url}
              alt="Imagen del post"
              className="w-full object-cover max-h-80"
            />
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="px-5 py-3 border-t border-[rgba(0,0,0,0.06)] flex items-center gap-1">
        {/* Like */}
        <button
          onClick={handleLike}
          disabled={isPendingLike}
          title={liked ? "Quitar like" : "Me gusta"}
          className={`inline-flex items-center gap-1.5 text-[14px] font-medium rounded-full px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed ${
            liked
              ? "text-[rgb(190,60,57)] bg-[rgba(196,59,56,0.075)] hover:bg-[rgba(196,59,56,0.12)]"
              : "text-black/[0.447] hover:text-[#202020] hover:bg-black/[0.063]"
          }`}
        >
          <Heart
            className={`w-3.5 h-3.5 transition-all ${liked ? "fill-[rgb(190,60,57)]" : ""}`}
          />
          {likesCount > 0 && <span>{likesCount}</span>}
        </button>

        {/* Comment toggle */}
        <button
          onClick={() => setShowComments((v) => !v)}
          title="Comentarios"
          className={`inline-flex items-center gap-1.5 text-[14px] font-medium rounded-full px-2.5 py-1.5 transition-colors ${
            showComments
              ? "text-[rgb(42,83,208)] bg-[rgba(42,83,208,0.075)] hover:bg-[rgba(42,83,208,0.12)]"
              : "text-black/[0.447] hover:text-[#202020] hover:bg-black/[0.063]"
          }`}
        >
          <MessageCircle
            className={`w-3.5 h-3.5 ${showComments ? "fill-[rgba(42,83,208,0.15)]" : ""}`}
          />
          {post.comments_count > 0 && <span>{post.comments_count}</span>}
        </button>

        {/* Views (read-only) */}
        {post.views_count > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[14px] text-black/[0.447] px-2.5 py-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            {fmtCount(post.views_count)}
          </span>
        )}

        {/* Share */}
        <button
          className="ml-auto p-1.5 rounded-full text-black/[0.447] hover:text-[#202020] hover:bg-black/[0.063] transition-colors"
          title="Compartir"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Comments section — lazy-mounted when opened */}
      {showComments && (
        <CommentSection
          postId={post.id}
          initialComments={post.recent_comments}
          totalComments={post.comments_count}
          currentUser={currentUser}
        />
      )}
    </article>
  );
}
