"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { AIAssistantPanel } from "@/components/layout/ai-assistant-panel";
import { MessagesPanel } from "@/components/messages/messages-panel";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [dmUnreadCount, setDmUnreadCount] = useState(0);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopBar
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onToggleAI={() => setAiOpen((v) => !v)}
        aiOpen={aiOpen}
        onToggleMessages={() => setMessagesOpen((v) => !v)}
        messagesOpen={messagesOpen}
        dmUnreadCount={dmUnreadCount}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar wrapper — animates width */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
            sidebarOpen ? "w-[280px]" : "w-0"
          }`}
        >
          <AppSidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>

        {/* Messages panel — slides in from right */}
        <MessagesPanel
          open={messagesOpen}
          onClose={() => setMessagesOpen(false)}
          onUnreadChange={setDmUnreadCount}
        />

        {/* AI assistant panel — slides in from right */}
        <AIAssistantPanel open={aiOpen} onClose={() => setAiOpen(false)} />
      </div>
    </div>
  );
}
