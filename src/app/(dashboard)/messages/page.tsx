import { getConversations } from "./actions";
import { MessagesPageClient } from "@/components/messages/messages-page-client";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const { conversations, tableExists } = await getConversations();
  return (
    <MessagesPageClient
      initialConversations={conversations}
      tableExists={tableExists}
    />
  );
}
