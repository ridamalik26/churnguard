import { Gauge, Layers, LayoutDashboard, Mail, Settings, Users } from "lucide-react";
import type { ComponentType } from "react";

export const NAV_ITEMS: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "At-Risk Customers", icon: Users },
  { href: "/segments", label: "Customer Segments", icon: Layers },
  { href: "/retention", label: "Retention Intelligence", icon: Mail },
  { href: "/model", label: "Model Performance", icon: Gauge },
  { href: "/settings", label: "Settings", icon: Settings },
];
