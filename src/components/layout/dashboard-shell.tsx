"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { AIAssistantPanel } from "@/components/layout/ai-assistant-panel";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopBar
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onToggleAI={() => setAiOpen((v) => !v)}
        aiOpen={aiOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar wrapper — animates width */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
            sidebarOpen ? "w-60" : "w-0"
          }`}
        >
          <AppSidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>

        {/* AI assistant panel — slides in from right */}
        <AIAssistantPanel open={aiOpen} onClose={() => setAiOpen(false)} />
      </div>
    </div>
  );
}
