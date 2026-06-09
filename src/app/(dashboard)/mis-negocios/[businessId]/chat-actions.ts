"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BusinessChatMessage {
  id: string;
  business_id: string;
  user_id: string;
  author_name: string | null;
  author_avatar_url: string | null;
  content: string;
  created_at: string;
}

// ─── getBusinessChatMessages ──────────────────────────────────────────────────

export async function getBusinessChatMessages(
  businessId: string
): Promise<{ messages: BusinessChatMessage[]; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { messages: [], error: "No autenticado" };

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("business_chat_messages")
      .select("id, business_id, user_id, author_name, author_avatar_url, content, created_at")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      // Table not created yet — return empty gracefully
      if (
        error.code === "42P01" ||
        error.message?.toLowerCase().includes("does not exist")
      ) {
        return { messages: [] };
      }
      return { messages: [], error: error.message };
    }

    return { messages: (data ?? []) as BusinessChatMessage[] };
  } catch {
    return { messages: [] };
  }
}

// ─── sendBusinessChatMessage ──────────────────────────────────────────────────

export async function sendBusinessChatMessage(
  businessId: string,
  content: string
): Promise<{ success?: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "No autenticado" };

  // Content validation
  const trimmed = content.trim();
  if (!trimmed) return { error: "El mensaje no puede estar vacío" };
  if (trimmed.length > 2000) return { error: "El mensaje supera los 2000 caracteres" };

  try {
    const supabase = createAdminClient();

    // Verify ownership — only business owner can write in V1
    const { data: bizRow } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", businessId)
      .maybeSingle();

    if (!bizRow) return { error: "Negocio no encontrado" };

    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    if (!userRow?.id || bizRow.owner_id !== userRow.id) {
      return { error: "Sin permiso para escribir en este chat" };
    }

    // Resolve author info: user_profiles → Clerk fallback
    const { data: profileRow } = await supabase
      .from("user_profiles")
      .select("display_name, username, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    let authorName: string | null = null;
    let authorAvatar: string | null = null;

    if (profileRow) {
      if (profileRow.display_name?.trim()) {
        authorName = profileRow.display_name.trim();
      } else if (profileRow.username?.trim()) {
        authorName = `@${profileRow.username.trim()}`;
      }
      authorAvatar = profileRow.avatar_url ?? null;
    }

    // Clerk fallback for anything still missing
    if (!authorName || !authorAvatar) {
      const clerk = await currentUser();
      if (clerk) {
        if (!authorName) {
          const full = [clerk.firstName, clerk.lastName].filter(Boolean).join(" ").trim();
          authorName = full || clerk.username || clerk.emailAddresses[0]?.emailAddress?.split("@")[0] || null;
        }
        if (!authorAvatar) {
          authorAvatar = clerk.imageUrl ?? null;
        }
      }
    }

    // Insert message
    const { error: insertError } = await supabase
      .from("business_chat_messages")
      .insert({
        business_id:       businessId,
        user_id:           userId,
        author_name:       authorName,
        author_avatar_url: authorAvatar,
        content:           trimmed,
      });

    if (insertError) {
      if (
        insertError.code === "42P01" ||
        insertError.message?.toLowerCase().includes("does not exist")
      ) {
        return {
          error:
            'La tabla de chat no existe todavía. Ejecuta el SQL en Supabase → SQL Editor.',
        };
      }
      return { error: `Error al enviar: ${insertError.message}` };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return { error: msg };
  }
}
