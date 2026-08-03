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
  ArrowLeft,
} from "lucide-react";

interface MenuItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: ("admin" | "staff" | "technician")[];
}

const items: MenuItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/pos", label: "POS Register", icon: ShoppingCart, roles: ["admin", "staff"] },
  { to: "/dashboard/repairs", label: "Repair Tickets", icon: Wrench },
  { to: "/dashboard/products", label: "Inventory & Parts", icon: Package },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/suppliers", label: "Suppliers", icon: Truck, roles: ["admin", "staff"] },
  { to: "/dashboard/purchases", label: "Purchases", icon: ShoppingBag, roles: ["admin", "staff"] },
  { to: "/dashboard/sales", label: "Sales Log", icon: CreditCard, roles: ["admin", "staff"] },
  { to: "/dashboard/expenses", label: "Expenses", icon: Receipt, roles: ["admin", "staff"] },
  { to: "/dashboard/reports", label: "Reports", icon: BarChart3, roles: ["admin", "staff"] },
  { to: "/dashboard/users", label: "Staff Accounts", icon: Shield, roles: ["admin"] },
  { to: "/dashboard/settings", label: "Settings", icon: SettingsIcon, roles: ["admin"] },
];

export function DashboardSidebar() {
  const { location } = useRouterState();
  const { role } = useAuth();

  const userRole = role ?? "staff";

  const visibleItems = items.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  return (
    <nav className="bg-[#1a1210] text-[#c8b8ae] w-full md:w-60 md:min-h-[calc(100vh-57px)] border-r border-[#2e1f1a] flex md:flex-col justify-between overflow-x-auto md:overflow-y-auto shrink-0">
      <div className="flex md:flex-col gap-0.5 p-2.5 min-w-max md:min-w-0 w-full">
        <div className="hidden md:block px-3 py-3 text-[9px] font-extrabold uppercase tracking-widest text-[#6b4f47] border-b border-[#2e1f1a] mb-1">
          Store Operations ERP
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.to ||
            (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-brand text-white shadow-sm"
                  : "text-[#c8b8ae] hover:text-white hover:bg-white/8"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="hidden md:block p-2.5 border-t border-[#2e1f1a]">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold text-[#6b4f47] hover:text-[#c8b8ae] hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Website
        </Link>
      </div>
    </nav>
  );
}
