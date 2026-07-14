import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local-First Docs",
  description: "A local-first, collaborative document editor with offline sync and version history.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
        <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-500">
          Built by{" "}
          <a href="https://github.com/hejazi-zarkawi" className="underline" target="_blank" rel="noreferrer">
            Heyzii
          </a>{" "}
          ·{" "}
          <a href="https://github.com/hejazi-zarkawi/local-first-doc-editor" className="underline" target="_blank" rel="noreferrer">
            GitHub
          </a>{" "}
          ·{" "}
          <a href="https://www.linkedin.com/in/hejazi-zarkawi" className="underline" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </footer>
      </body>
    </html>
  );
}
