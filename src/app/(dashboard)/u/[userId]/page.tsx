import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserProfile } from "./actions";
import { UserProfileClient } from "./profile-client";

interface Props {
  params: { userId: string };
}

export default async function UserProfilePage({ params }: Props) {
  const [{ userId: currentUserId }, user, profile] = await Promise.all([
    auth(),
    currentUser(),
    getUserProfile(params.userId),
  ]);

  const currentUserData = currentUserId
    ? {
        id: currentUserId,
        name: user?.firstName
          ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`.trim()
          : (user?.emailAddresses?.[0]?.emailAddress ?? "Usuario"),
        avatarUrl: user?.imageUrl ?? null,
        initials: user?.firstName
          ? (user.firstName[0] + (user.lastName?.[0] ?? "")).toUpperCase()
          : "U",
      }
    : null;

  return (
    <UserProfileClient
      profile={profile}
      currentUser={currentUserData}
    />
  );
}
