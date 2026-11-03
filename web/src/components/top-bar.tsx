import { NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";

export function TopBar() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:justify-end md:px-8">
        <p className="text-lg font-semibold tracking-tight md:hidden">ChurnGuard</p>
        <ThemeToggle />
      </div>
      <div className="px-2 pb-2 md:hidden">
        <NavLinks layout="horizontal" />
      </div>
    </header>
  );
}
