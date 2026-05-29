import { auth, currentUser } from "@clerk/nextjs/server";
import {
  getFeedPosts,
  getUserFeedBusinesses,
  getFeedCreators,
  getUserFollowedIds,
} from "./actions";
import { FEED_POSTS_SQL } from "./constants";
import { InicioFeed } from "@/components/dashboard/inicio-feed";

export default async function InicioPage() {
  const { userId } = await auth();

  const [
    { posts, tableExists, fetchError },
    user,
    userBusinesses,
    creators,
    followedUserIds,
  ] = await Promise.all([
    getFeedPosts(),
    currentUser(),
    getUserFeedBusinesses(),
    getFeedCreators(),
    getUserFollowedIds(),
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
      fetchError={fetchError}
      migrationSQL={FEED_POSTS_SQL}
      currentUser={currentUserData}
      userBusinesses={userBusinesses}
      creators={creators}
      followedUserIds={followedUserIds}
    />
  );
}
