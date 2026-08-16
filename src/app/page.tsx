import { auth } from "@clerk/nextjs/server";
import { PublicHeader } from "@/components/landing/public-header";
import { Hero } from "@/components/landing/hero";
import { PublicFooter } from "@/components/landing/public-footer";

/**
 * Public entry point for Mundo Academy.
 *
 * `/` used to redirect straight into the app (authed → /descubrir, else →
 * /sign-in). It now renders the landing for everyone; the route was already
 * listed as public in the Clerk middleware, so no redirect rules changed.
 * Signed-in visitors get an explicit "Ir a mi panel" link in the header instead
 * of being bounced automatically.
 *
 * This lives outside the (dashboard) route group, so it never mounts
 * DashboardShell — no sidebar, no topbar, no dashboard state.
 */
export default async function RootPage() {
  const { userId } = await auth();

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col">
      <PublicHeader isAuthed={Boolean(userId)} />
      <Hero />
      <PublicFooter />
    </div>
  );
}
