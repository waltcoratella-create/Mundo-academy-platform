import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default function RootPage() {
  const { userId } = auth();
  if (userId) redirect("/descubrir");
  redirect("/sign-in");
}
