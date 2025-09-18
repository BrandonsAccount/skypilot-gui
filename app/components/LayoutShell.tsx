"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function LayoutShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area: make this a column with a scrollable middle */}
      <div className="flex-1 flex flex-col">
        <div className="max-w-3xl w-full mx-auto p-4 flex flex-col h-full">
          <header className="flex items-center justify-between mb-4 flex-none">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-[#9ca3af] hover:bg-[#17171a]"
                aria-label="Open sidebar"
                onClick={() => setSidebarOpen(true)}
              >
                ☰
              </button>
            </div>

            <div className="space-x-2">
              <span className="badge">Persona: Developer</span>
            </div>
          </header>

          {/* Scrollable content area */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>

          {/* Footer: reduced top margin and centered inside same max-width container as the composer */}
          <div className="mt-4 text-sm text-[#9ca3af] text-center flex-none">
            Skypilot can make mistakes. Always verify critical information.
          </div>
        </div>
      </div>
    </div>
  );
}