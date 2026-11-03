import { NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[220px] shrink-0 flex-col border-r border-line bg-surface md:flex">
      <p className="px-5 pt-6 pb-8 text-[18px] font-bold tracking-tight">ChurnGuard</p>
      <NavLinks />
      <div className="mt-auto px-3 py-4">
        <ThemeToggle />
      </div>
    </aside>
  );
}
