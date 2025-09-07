"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function LayoutShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex-1 min-h-screen">
        <div className="max-w-3xl mx-auto p-4">
          <header className="flex items-center justify-between mb-4">
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

          {/* page content */}
          <main>{children}</main>

          {/* Footer: reduced top margin and centered inside same max-width container as the composer */}
          <div className="mx-auto w-full max-w-3xl px-4">
            <footer className="mt-4 text-sm text-[#9ca3af] text-center">
              Skypilot can make mistakes. Always verify critical information.
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}