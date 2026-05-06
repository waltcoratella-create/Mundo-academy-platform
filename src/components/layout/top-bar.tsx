"use client";

import { UserButton } from "@clerk/nextjs";
import { Menu, Search, MessageCircle, Bell, Wallet, Sparkles } from "lucide-react";

interface Props {
  onToggleSidebar: () => void;
  onToggleAI: () => void;
  aiOpen: boolean;
}

export function TopBar({ onToggleSidebar, onToggleAI, aiOpen }: Props) {
  return (
    <header className="h-16 shrink-0 bg-white border-b border-gray-100 flex items-center px-4 gap-3 z-20 shadow-sm">
      {/* Hamburger */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo */}
      <span className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap select-none">
        🌍 MUNDO ACADEMY
      </span>

      <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />

      {/* Search */}
      <div className="flex-1 max-w-xl">
        <label className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 cursor-text hover:border-gray-300 transition-colors">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar en Mundo Academy"
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none min-w-0"
          />
        </label>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Chat with red badge */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <MessageCircle className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        {/* AI button */}
        <button
          onClick={onToggleAI}
          aria-label="Asistente IA"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
            aiOpen
              ? "bg-gradient-to-br from-purple-600 to-blue-500 shadow-md shadow-purple-200 scale-105"
              : "bg-gradient-to-br from-purple-500 to-blue-400 hover:from-purple-600 hover:to-blue-500 hover:shadow-md hover:shadow-purple-200"
          }`}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </button>

        {/* Balance pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 whitespace-nowrap">
          <Wallet className="w-3.5 h-3.5 text-gray-400" />
          0,00 US$
        </div>

        {/* Avatar */}
        <div className="ml-1">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    </header>
  );
}
