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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full w-full overflow-x-hidden antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full w-full overflow-x-hidden bg-bg">
        <div className="flex min-h-screen w-full flex-row">
          <Sidebar />
          <div className="min-h-screen w-full ml-0 overflow-x-hidden md:ml-[240px] md:w-[calc(100%-240px)]">
            <TopNav />
            <Topbar />
            <main className="px-4 py-6 md:px-10 md:py-10">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
