import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wrench,
  Users,
  Truck,
  ShoppingBag,
  CreditCard,
  Receipt,
  BarChart3,
  Shield,
  Settings as SettingsIcon,
  FileText,
  Smartphone,
} from "lucide-react";

export interface MenuItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: ("admin" | "staff" | "technician")[];
}

export const menuItems: MenuItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/pos", label: "POS Register", icon: ShoppingCart, roles: ["admin", "staff"] },
  { to: "/dashboard/repairs", label: "Repair Invoices", icon: FileText },
  { to: "/dashboard/products", label: "Inventory & Parts", icon: Package },
  { to: "/dashboard/phone-buy-sell", label: "Phone Buy & Sell", icon: Smartphone, roles: ["admin", "staff"] },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/suppliers", label: "Suppliers", icon: Truck, roles: ["admin", "staff"] },
  { to: "/dashboard/purchases", label: "Purchases", icon: ShoppingBag, roles: ["admin", "staff"] },
  { to: "/dashboard/sales", label: "Sales Log", icon: CreditCard, roles: ["admin", "staff"] },
  { to: "/dashboard/expenses", label: "Expenses", icon: Receipt, roles: ["admin", "staff"] },
  { to: "/dashboard/reports", label: "Reports", icon: BarChart3, roles: ["admin", "staff"] },
  { to: "/dashboard/users", label: "Staff Accounts", icon: Shield, roles: ["admin"] },
  { to: "/dashboard/settings", label: "Settings", icon: SettingsIcon, roles: ["admin"] },
];

export function DashboardTopbarNav({ onItemClick }: { onItemClick?: () => void }) {
  const { location } = useRouterState();
  const { role } = useAuth();

  const userRole = role ?? "staff";

  const visibleItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  return (
    <nav className="bg-[#1a1210] px-3 py-2 overflow-x-auto flex items-center gap-1.5 border-t border-white/10 scrollbar-none">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          location.pathname === item.to ||
          (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onItemClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 min-h-[40px] ${
              isActive
                ? "bg-brand text-white shadow-sm font-extrabold"
                : "text-[#c8b8ae] hover:text-white hover:bg-white/10"
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardSidebarNav({ onItemClick }: { onItemClick?: () => void }) {
  const { location } = useRouterState();
  const { role } = useAuth();

  const userRole = role ?? "staff";

  const visibleItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  return (
    <nav className="flex flex-col gap-1 w-full">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          location.pathname === item.to ||
          (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onItemClick}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
              isActive
                ? "bg-brand text-white shadow-sm font-extrabold"
                : "text-[#c8b8ae] hover:text-white hover:bg-white/10"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardSidebar() {
  return <DashboardTopbarNav />;
}
