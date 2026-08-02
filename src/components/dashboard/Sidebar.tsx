import { Link, useRouterState } from "@tanstack/react-router";
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
  ArrowLeft
} from "lucide-react";

const items = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/pos", label: "POS Register", icon: ShoppingCart },
  { to: "/dashboard/repairs", label: "Repair Tickets", icon: Wrench },
  { to: "/dashboard/products", label: "Inventory & Parts", icon: Package },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/suppliers", label: "Suppliers", icon: Truck },
  { to: "/dashboard/purchases", label: "Purchases", icon: ShoppingBag },
  { to: "/dashboard/sales", label: "Sales Log", icon: CreditCard },
  { to: "/dashboard/expenses", label: "Expenses", icon: Receipt },
  { to: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { to: "/dashboard/users", label: "Staff Accounts", icon: Shield },
  { to: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

export function DashboardSidebar() {
  const { location } = useRouterState();

  return (
    <nav className="bg-[#0F172A] text-slate-300 w-full md:w-64 md:min-h-[calc(100vh-65px)] border-r border-slate-800 flex md:flex-col justify-between overflow-x-auto md:overflow-y-auto">
      <div className="flex md:flex-col gap-1 p-3 min-w-max md:min-w-0 w-full">
        <div className="hidden md:block px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          Store Operations ERP
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[#E11D48] text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/80"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="hidden md:block p-3 border-t border-slate-800">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Public Website
        </Link>
      </div>
    </nav>
  );
}
