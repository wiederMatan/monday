import type { Metadata, Viewport } from "next";
import { Figtree, Poppins } from "next/font/google";
import { Suspense } from "react";
import { SidebarSkeleton, TopBarSkeleton } from "@/components/app/AppSkeleton";
import { BrowserOnly } from "@/components/app/BrowserOnly";
import { GlobalLayer } from "@/components/app/GlobalLayer";
import { Providers } from "@/components/app/Providers";
import { Sidebar } from "@/components/app/Sidebar";
import { TopBar } from "@/components/app/TopBar";
import { THEME_STORAGE_KEY } from "@/lib/constants";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "monday · Work management",
  description: "Plan, track and manage any type of work with boards, automations, and views.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceff8" },
    { media: "(prefers-color-scheme: dark)", color: "#111326" },
  ],
};

// Runs before first paint so a saved dark theme never flashes light.
const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"||t==="night"||t==="light"){var d=document.documentElement;d.setAttribute("data-theme",t);d.style.colorScheme=t==="light"?"light":"dark"}}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${figtree.variable} ${poppins.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full">
        <Providers>
          {/* The frame is static; each data-driven part is its own browser-only island. */}
          <div className="flex h-dvh flex-col overflow-hidden">
            <Suspense fallback={<TopBarSkeleton />}>
              <BrowserOnly>
                <TopBar />
              </BrowserOnly>
            </Suspense>
            <div className="flex min-h-0 flex-1 pr-2">
              <Suspense fallback={<SidebarSkeleton />}>
                <BrowserOnly>
                  <Sidebar />
                </BrowserOnly>
              </Suspense>
              <main className="relative ml-2 min-w-0 flex-1 overflow-hidden rounded-t-xl bg-surface shadow-card">{children}</main>
            </div>
          </div>
          <Suspense fallback={null}>
            <BrowserOnly>
              <GlobalLayer />
            </BrowserOnly>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
