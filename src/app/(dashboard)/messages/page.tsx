import { getConversations } from "./actions";
import { MessagesPageClient } from "@/components/messages/messages-page-client";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { conv?: string | string[] };
}

export default async function MessagesPage({ searchParams }: Props) {
  const { conversations, tableExists } = await getConversations();
  const initialSelectedId =
    typeof searchParams.conv === "string" ? searchParams.conv : undefined;

  return (
    <MessagesPageClient
      initialConversations={conversations}
      tableExists={tableExists}
      initialSelectedId={initialSelectedId}
    />
  );
}
