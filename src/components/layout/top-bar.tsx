"use client";

import { Menu, Search, MessageCircle, Wallet, Sparkles } from "lucide-react";
import { NotificationsBell } from "@/components/dashboard/inicio/notifications-bell";
import { UserMenu } from "@/components/layout/user-menu";

interface Props {
  onToggleSidebar: () => void;
  onToggleAI: () => void;
  aiOpen: boolean;
  onToggleMessages: () => void;
  messagesOpen: boolean;
  dmUnreadCount?: number;
}

export function TopBar({ onToggleSidebar, onToggleAI, aiOpen, onToggleMessages, messagesOpen, dmUnreadCount = 0 }: Props) {
  return (
    <header className="h-14 shrink-0 sticky top-0 z-50 bg-white border-b border-[rgba(0,0,0,0.122)] flex items-center px-4 gap-2">

      {/* Hamburger */}
      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/[0.063] text-[#202020] transition-colors shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo */}
      <span className="h-10 px-2 -ml-2 rounded-[10px] flex items-center select-none text-[15px] font-semibold text-[#202020] tracking-tight whitespace-nowrap">
        🌍 Mundo Academy
      </span>

      {/* Search */}
      <div className="flex-1 max-w-xl mx-2">
        <label className="flex items-center gap-2 bg-[#f3f3f3] border border-[#dcdcdc] rounded-full px-4 h-10 cursor-text hover:border-[rgba(0,0,0,0.3)] transition-colors">
          <Search className="w-4 h-4 text-[rgba(0,0,0,0.4)] shrink-0" />
          <input
            type="text"
            placeholder="Buscar en Mundo Academy"
            className="flex-1 bg-transparent text-[14px] text-[#202020] placeholder-[rgba(0,0,0,0.4)] outline-none min-w-0"
          />
        </label>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 ml-auto">

        {/* Chat */}
        <button
          onClick={onToggleMessages}
          aria-label="Mensajes"
          aria-pressed={messagesOpen}
          className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            messagesOpen
              ? "bg-black/[0.063] text-[#202020]"
              : "hover:bg-black/[0.063] text-[#202020]"
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          {/* Unread badge */}
          {dmUnreadCount > 0 && (
            <span className="absolute top-0 right-0 min-w-[16px] h-4 px-[3px] rounded-full bg-[#d4544f] flex items-center justify-center text-[10px] font-bold text-white leading-none pointer-events-none">
              {dmUnreadCount > 99 ? "99+" : dmUnreadCount}
            </span>
          )}
        </button>

        {/* Notifications */}
        <NotificationsBell />

        {/* AI assistant */}
        <button
          onClick={onToggleAI}
          aria-label="Asistente IA"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            aiOpen
              ? "bg-gradient-to-br from-purple-600 to-blue-500 shadow-md shadow-purple-200 scale-105"
              : "bg-gradient-to-br from-purple-500 to-blue-400 hover:from-purple-600 hover:to-blue-500 hover:shadow-sm hover:shadow-purple-200"
          }`}
        >
          <Sparkles className="w-5 h-5 text-white" />
        </button>

        {/* Balance pill */}
        <button className="flex items-center gap-2 h-10 px-4 rounded-full bg-black/[0.063] hover:bg-black/[0.09] transition-colors whitespace-nowrap">
          <Wallet className="w-4 h-4 text-[#202020]" />
          <span className="text-[15px] font-medium tracking-[-0.18px] text-[#202020]">
            0,00 US$
          </span>
        </button>

        {/* Avatar + user menu */}
        <UserMenu />

      </div>
    </header>
  );
}
