import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import {
  getBusinessProfile,
  getBusinessFeedPosts,
  getBusinessPublicProducts,
} from "./actions";
import { BusinessProfileClient } from "./business-profile-client";

export default async function BusinessProfilePage({
  params,
}: {
  params: { businessId: string };
}) {
  const { userId } = await auth();

  const [user, profile, posts, products] = await Promise.all([
    currentUser(),
    getBusinessProfile(params.businessId, userId),
    getBusinessFeedPosts(params.businessId),
    getBusinessPublicProducts(params.businessId),
  ]);

  if (!profile) notFound();

  const currentUserData =
    userId && user
      ? {
          id: userId,
          name:
            user.fullName ??
            user.firstName ??
            user.emailAddresses?.[0]?.emailAddress?.split("@")[0] ??
            "Usuario",
          avatarUrl: user.imageUrl ?? null,
        }
      : null;

  return (
    <BusinessProfileClient
      profile={profile}
      posts={posts}
      products={products}
      currentUser={currentUserData}
    />
  );
}
