"use client";

import React from "react";
import { usePrompt } from "./PromptProvider";

type Props = {
  open?: boolean; // overlay open (mobile)
  onClose?: () => void;
};

export default function Sidebar({ open = false, onClose }: Props) {
  const { prompts, recentPrompts, setInput } = usePrompt();

  // truncate helper
  const truncate = (s: string, n = 50) => (s.length > n ? `${s.substring(0, n)}...` : s);

  // New: shorten recent title truncation to ~75% of previous (previous used ~40)
  const TITLE_TRUNC_RECENT = 30;
  // Body truncate length for preview in sidebar
  const BODY_TRUNC_RECENT = 60;

  // render content (used both for sidebar column and overlay)
  const content = (
    <div className="h-full flex flex-col min-w-0">
      {/* Top: Logo centered + (mobile) close */}
      <div className="px-4 py-4 border-b border-[#23262b]">
        <div className="relative w-full flex items-center justify-center">
          <img
            src="/img/skypilot-white-logo.png"
            alt="SkyPilot"
            className="w-36 mx-auto max-w-full"
          />
          {/* close for overlay mobile - positioned absolutely so it does not affect centering */}
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="md:hidden absolute right-2 inline-flex items-center justify-center p-2 rounded-md text-[#9ca3af] hover:bg-[#17171a]"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Middle: New Chat, Recent Prompts, Common Prompts */}
      {/* NOTE: removed bottom padding (no pb-4) so footer can sit without extra space */}
      <div className="px-3 pt-3 flex-1 overflow-auto min-w-0">
        <button
          onClick={() => setInput("")}
          className="w-full mb-2 inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-[#0b7a60] hover:bg-[#0e8f70] text-white"
          aria-label="New chat"
        >
          + New Chat
        </button>

        {/* Recent Prompts */}
        <div className="mt-3 space-y-2">
          <div className="px-2 py-1 text-xs text-[#9ca3af] flex items-center justify-between">
            <span>RECENT</span>
            {/* small clear action */}
            {recentPrompts.length > 0 && (
              <span className="text-[11px] text-[#6b7280]">Saved</span>
            )}
          </div>

          <nav className="flex flex-col gap-1 min-w-0">
            {recentPrompts.length === 0 && (
              <div className="px-3 py-2 text-sm text-[#9ca3af]">No recent prompts</div>
            )}

            {recentPrompts.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  // full body used for input on click (no change)
                  setInput(p.body);
                  // close overlay on mobile if provided
                  onClose?.();
                }}
                // set the full body as the tooltip (title) for accessibility/heavy content viewing
                title={p.body}
                className="text-left px-3 py-2 rounded-lg hover:bg-[#17171a] transition-colors overflow-hidden min-w-0"
              >
                {/* Title: truncated to a shorter length (about 75% of previous) */}
                <div className="text-sm text-[#e6e7e8] truncate min-w-0">
                  {p.title ? truncate(p.title, TITLE_TRUNC_RECENT) : truncate(p.body, TITLE_TRUNC_RECENT)}
                </div>

                {/* Body preview: show truncated preview for display (keeps full content on click).
                    Use whitespace-normal and break-words so truncated preview can wrap inside sidebar width. */}
                <div className="text-xs text-[#9ca3af] whitespace-normal break-words overflow-hidden">
                  {truncate(p.body, BODY_TRUNC_RECENT)}
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Common Prompts */}
        <div className="mt-6 space-y-2">
          <div className="px-2 py-1 text-xs text-[#9ca3af]">COMMON PROMPTS</div>
          <nav className="flex flex-col gap-1 min-w-0">
            {prompts.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setInput(p.body);
                  onClose?.();
                }}
                className="text-left px-3 py-2 rounded-lg hover:bg-[#17171a] transition-colors overflow-hidden min-w-0"
                title={p.title}
              >
                <span className="block truncate" style={{ maxWidth: "100%" }}>
                  {p.title}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom: account/manage button */}
      {/* Sticky so it stays visible without scrolling */}
      <div className="px-4 py-3 border-t border-[#23262b] sticky bottom-0 bg-[#111318] z-10">
        <button
          className="w-full inline-flex items-center justify-start gap-3 rounded-2xl px-3 py-2 bg-transparent border border-[#2b2b2b] text-[#e6e7e8] hover:bg-[#17171a]"
          aria-label="Guest account"
        >
          <img
            src="/img/guest-avatar.png"
            alt="Guest avatar"
            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
          />
          <span className="text-sm">Guest account</span>
        </button>
      </div>
    </div>
  );

  // Desktop: fixed column; Mobile: overlay with slide-in
  return (
    <>
      {/* Desktop column */}
      <div className="hidden md:flex md:flex-shrink-0 w-56 min-h-screen bg-[#111318] border-r border-[#23262b] text-sm text-[#e6e7e8] min-w-0">
        {content}
      </div>

      {/* Mobile overlay */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity ${
          open ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={onClose}
        />
        <div
          className={`absolute left-0 top-0 bottom-0 w-56 bg-[#111318] border-r border-[#23262b] transform transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {content}
        </div>
      </div>
    </>
  );
}