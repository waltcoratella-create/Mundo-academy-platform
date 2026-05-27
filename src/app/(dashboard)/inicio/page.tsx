import { auth, currentUser } from "@clerk/nextjs/server";
import { getFeedPosts } from "./actions";
import { FEED_POSTS_SQL } from "./constants";
import { InicioFeed } from "@/components/dashboard/inicio-feed";

export default async function InicioPage() {
  const { userId } = await auth();

  const [{ posts, tableExists }, user] = await Promise.all([
    getFeedPosts(),
    currentUser(),
  ]);

  const currentUserData = userId
    ? {
        id: userId,
        name: user?.firstName
          ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`.trim()
          : (user?.emailAddresses?.[0]?.emailAddress ?? "Usuario"),
        avatarUrl: user?.imageUrl ?? null,
        initials: user?.firstName
          ? (
              user.firstName[0] + (user.lastName?.[0] ?? "")
            ).toUpperCase()
          : "U",
      }
    : null;

  return (
    <InicioFeed
      initialPosts={posts}
      tableExists={tableExists}
      migrationSQL={FEED_POSTS_SQL}
      currentUser={currentUserData}
    />
  );
}
