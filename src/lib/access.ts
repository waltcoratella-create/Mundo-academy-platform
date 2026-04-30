import { currentUser } from "@clerk/nextjs/server";

export async function hasProAccess(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  return Boolean(user.publicMetadata?.isPro);
}
