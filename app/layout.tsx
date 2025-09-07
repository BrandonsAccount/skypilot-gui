import "./globals.css";
import type { ReactNode } from "react";
import LayoutShell from "./components/LayoutShell";
import { PromptProvider } from "./components/PromptProvider";

export const metadata = {
  title: "SkyPilot",
  description: "AI chat interface with BFF and optional auth",
  icons: [
    { rel: "icon", url: "img/favicon.ico" },
    { rel: "16x16-icon", url: "/img/favicon-16x16.png" },
    { rel: "32x32-icon", url: "/img/favicon-32x32.png" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#212121] text-white">
        <PromptProvider>
          <LayoutShell>{children}</LayoutShell>
        </PromptProvider>
      </body>
    </html>
  );
}