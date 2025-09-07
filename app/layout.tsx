import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
    title: "SkyPilot",
    description: "AI chat interface with BFF and optional auth",
    icons: [
      { rel: "icon", url: "img/favicon.ico" },
      { rel: "16x16-icon", url: "/img/favicon-16x16.png" },
      { rel: "32x32-icon", url: "/img/favicon-32x32.png" }
    ]
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="flex items-center justify-between mb-4">
            <div className="font-semibold center"><img src="/img/skypilot-white-logo.png" width="100px" /></div>
            <div className="space-x-2">
              <span className="badge">User: Guest</span>
            </div>
          </header>
          {children}
          <footer className="mt-8 text-sm text-gray-500">
              Skypilot can make mistakes. Always verify critical information.
          </footer>
        </div>
      </body>
    </html>
  );
}
