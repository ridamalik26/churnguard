import { NavLinks } from "@/components/nav-links";

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-line bg-surface px-3 py-5 md:flex">
      <p className="px-3 text-lg font-semibold tracking-tight">ChurnGuard</p>
      <NavLinks layout="vertical" />
    </aside>
  );
}
