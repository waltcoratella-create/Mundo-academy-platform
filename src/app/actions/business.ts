"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createFirstBusiness(
  name: string = "Mi negocio",
  type: string = "course"
) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  const supabase = createAdminClient();

  // Upsert user to satisfy FK businesses.owner_id → users.id
  await supabase.from("users").upsert(
    {
      id: userId,
      email,
      full_name: fullName || null,
      avatar_url: user?.imageUrl ?? null,
    },
    { onConflict: "id" }
  );

  // Generate unique slug
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const slug = `${base}-${userId.slice(-6)}-${Date.now().toString(36)}`;

  const { error } = await supabase.from("businesses").insert({
    owner_id: userId,
    name,
    slug,
    type,
    status: "draft",
  });

  if (error) throw new Error(error.message);

  redirect("/mis-negocios");
}
