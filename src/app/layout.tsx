import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Unbounded } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Navbar";
import { ToastProvider } from "@/components/ui/Toast";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "nook — show off what you collect", template: "%s · nook" },
  description: "nook is a home for your collections. Build pages, stock shelves with links and photos, and share them with the world.",
  openGraph: { title: "nook", description: "Show off what you collect.", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0b" },
  ],
};

const unbounded = Unbounded({ subsets: ["latin"], variable: "--font-unbounded", display: "swap" });

const bootScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);if(localStorage.getItem('shelfie.nav-pinned')==='1')document.documentElement.setAttribute('data-nav-pinned','true')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${unbounded.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <ToastProvider>
          <Shell>{children}</Shell>
        </ToastProvider>
      </body>
    </html>
  );
}
