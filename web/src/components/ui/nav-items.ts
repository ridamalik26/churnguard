import { BarChart2, LayoutDashboard, Mail, PieChart, Settings, Users } from "lucide-react";
import type { ComponentType } from "react";

export type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };

export const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "ANALYTICS",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/customers", label: "At-Risk Customers", icon: Users },
      { href: "/segments", label: "Customer Segments", icon: PieChart },
      { href: "/retention", label: "Retention Intelligence", icon: Mail },
      { href: "/model", label: "Model Performance", icon: BarChart2 },
    ],
  },
  {
    label: "SYSTEM",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);
