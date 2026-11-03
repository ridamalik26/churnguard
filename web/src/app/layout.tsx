import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChurnGuard",
  description: "Telecom churn predictions and retention messaging.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <div className="flex min-h-dvh flex-col md:flex-row">
          <AppSidebar />
          <MobileNav />
          <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
