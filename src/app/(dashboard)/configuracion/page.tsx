import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserProfileData } from "./actions";
import { AccountSettingsClient } from "./account-settings-client";

export default async function ConfiguracionPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user, profileData] = await Promise.all([
    currentUser(),
    getUserProfileData(),
  ]);

  const clerkData = {
    id: userId,
    fullName: user?.fullName ?? user?.firstName ?? null,
    imageUrl: user?.imageUrl ?? null,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
  };

  return <AccountSettingsClient clerkData={clerkData} initialProfile={profileData} />;
}
