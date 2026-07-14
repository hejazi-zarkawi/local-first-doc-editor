import type { Metadata } from "next";
import "./globals.css";
import { Github, Linkedin, Heart } from "lucide-react";
export const metadata: Metadata = {
  title: "Local-First Docs",
  description: "A local-first, collaborative document editor with offline sync and version history.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
        {/* <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-500">
          Built by{" "}
          <a href="https://github.com/hejazi-zarkawi" className="underline" target="_blank" rel="noreferrer">
            Mohammad Umar Al Hejazi
          </a>{" "}
          ·{" "}
          <a href="https://github.com/hejazi-zarkawi/local-first-doc-editor" className="underline" target="_blank" rel="noreferrer">
            GitHub
          </a>{" "}
          ·{" "}
          <a href="https://www.linkedin.com/in/mohammad-umar-al-hejazi/" className="underline" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </footer> */}
        <footer className="border-t border-neutral-200 bg-white py-6 mt-auto">
  <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-neutral-600 md:flex-row">
    <p className="flex items-center gap-1">
      Built with <Heart className="h-4 w-4 fill-red-500 text-red-500" /> by{" "}
      <span className="font-semibold text-neutral-900">
        Mohammad Umar Al Hejazi
      </span>
    </p>

    <div className="flex items-center gap-6">
      <a
        href="https://github.com/hejazi-zarkawi"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 transition-colors hover:text-black"
      >
        <Github className="h-5 w-5" />
        <span>GitHub</span>
      </a>

      <a
        href="https://github.com/hejazi-zarkawi/local-first-doc-editor"
        target="_blank"
        rel="noreferrer"
        className="transition-colors hover:text-black"
      >
        Project
      </a>

      <a
        href="https://www.linkedin.com/in/mohammad-umar-al-hejazi/"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-[#0A66C2] transition-opacity hover:opacity-80"
      >
        <Linkedin className="h-5 w-5" />
        <span>LinkedIn</span>
      </a>
    </div>
  </div>
</footer>
      </body>
    </html>
  );
}
