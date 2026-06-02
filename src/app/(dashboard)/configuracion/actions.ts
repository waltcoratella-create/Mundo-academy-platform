"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfileData {
  user_id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  birth_date: string | null;
  cover_url: string | null;
  avatar_url: string | null;
  show_total_earned: boolean;
  show_location: boolean;
  show_owned_businesses: boolean;
  show_joined_businesses: boolean;
}

// ── getUserProfileData ────────────────────────────────────────────────────────

export async function getUserProfileData(): Promise<UserProfileData | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "42P01") {
    console.error("[getUserProfileData]", error.code, error.message);
  }

  // If row found, return it
  if (data) return data as UserProfileData;

  // Fallback: seed from Clerk
  const user = await currentUser();
  return {
    user_id: userId,
    display_name: user?.fullName ?? user?.firstName ?? null,
    username: null,
    bio: null,
    birth_date: null,
    cover_url: null,
    avatar_url: user?.imageUrl ?? null,
    show_total_earned: true,
    show_location: true,
    show_owned_businesses: true,
    show_joined_businesses: true,
  };
}

// ── updateUserProfile ─────────────────────────────────────────────────────────

export async function updateUserProfile(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "No autenticado" };

  const displayName = ((formData.get("display_name") as string) ?? "").trim();
  const rawUsername = ((formData.get("username") as string) ?? "").trim();
  const bio         = ((formData.get("bio") as string) ?? "").trim();
  const birthDate   = ((formData.get("birth_date") as string) ?? "").trim() || null;

  // Normalise username: lowercase, only [a-z0-9._]
  const username = rawUsername.toLowerCase().replace(/\s+/g, "");

  // Validate lengths
  if (displayName.length > 100)
    return { error: "El nombre no puede superar 100 caracteres" };
  if (username.length > 42)
    return { error: "El username no puede superar 42 caracteres" };
  if (bio.length > 200)
    return { error: "La bio no puede superar 200 caracteres" };

  // Validate username characters
  if (username && !/^[a-z0-9._]+$/.test(username))
    return {
      error:
        "El username solo puede contener letras, números, puntos y guiones bajos",
    };

  // Boolean toggles sent as "true"/"false" strings
  const showTotalEarned     = formData.get("show_total_earned")     === "true";
  const showLocation        = formData.get("show_location")         === "true";
  const showOwnedBusinesses = formData.get("show_owned_businesses") === "true";
  const showJoinedBusinesses= formData.get("show_joined_businesses")=== "true";

  const supabase = createAdminClient();

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id:               userId,
      display_name:          displayName || null,
      username:              username || null,
      bio:                   bio || null,
      birth_date:            birthDate,
      show_total_earned:     showTotalEarned,
      show_location:         showLocation,
      show_owned_businesses: showOwnedBusinesses,
      show_joined_businesses: showJoinedBusinesses,
      updated_at:            new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    if (error.code === "42P01")
      return {
        error:
          'Tabla user_profiles no existe. Ejecuta la migración en Supabase primero.',
      };
    if (error.code === "23505")
      return { error: "Ese username ya está en uso. Elige otro." };
    console.error("[updateUserProfile]", error.code, error.message);
    return { error: "Error al guardar los cambios. Intenta de nuevo." };
  }

  revalidatePath("/inicio");
  revalidatePath("/configuracion");
  revalidatePath(`/u/${userId}`);
  return { success: true };
}
