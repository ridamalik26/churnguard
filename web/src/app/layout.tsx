import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChurnGuard",
  description: "Telecom churn predictions and retention messaging.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <div className="flex min-h-dvh">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
