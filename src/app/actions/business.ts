"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createFirstBusiness(
  name: string = "Mi negocio",
  _type: string = "course"
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

  const { error } = await supabase.from("businesses").insert({
    owner_id: userId,
    name,
  });

  if (error) throw new Error(error.message);

  redirect("/mis-negocios");
}
