import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/ui/Sidebar";
import { Topbar } from "@/components/ui/Topbar";
import { TopNav } from "@/components/ui/TopNav";
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
      <body className="min-h-full bg-bg">
        <div className="flex min-h-dvh flex-col md:flex-row">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopNav />
            <Topbar />
            <main className="min-w-0 flex-1 bg-bg px-4 py-6 md:px-10 md:py-10">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
