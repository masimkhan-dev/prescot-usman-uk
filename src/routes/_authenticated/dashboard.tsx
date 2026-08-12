import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { DashboardTopbarNav } from "@/components/dashboard/Sidebar";
import { WelcomeToast, clearWelcomeToastFlag } from "@/components/dashboard/WelcomeToast";
import { LogOut, Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { signOut, user, role } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    clearWelcomeToastFlag();
    await signOut();
    router.navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface relative">
      <WelcomeToast />

      {/* Top Header & Navigation Bar */}
      <header className="bg-[#1a1210] border-b border-[#2e1f1a] sticky top-0 z-40 shadow-md">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 flex-wrap gap-2">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-white">
              PRESCOT <span className="text-brand">MOBILES</span>
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand/20 text-brand text-[10px] font-extrabold uppercase tracking-wide">
              Store Operations ERP
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            {user?.email && (
              <span className="text-xs text-[#c8b8ae] font-semibold hidden md:inline-block">
                User: <span className="text-white">{user.email}</span> ({role ?? "staff"})
              </span>
            )}
            <Link
              to="/"
              className="text-xs font-semibold text-[#c8b8ae] hover:text-white flex items-center gap-1 transition-colors py-1"
            >
              <Globe className="w-3.5 h-3.5" /> Website
            </Link>
            <button
              onClick={handleSignOut}
              className="text-xs font-bold text-brand hover:text-rose-400 flex items-center gap-1 transition-colors py-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>

        {/* Top Horizontal Navigation Bar */}
        <DashboardTopbarNav />
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full min-w-0">
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden min-w-0 w-full max-w-[1920px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
