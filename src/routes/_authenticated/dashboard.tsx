import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { WelcomeToast, clearWelcomeToastFlag } from "@/components/dashboard/WelcomeToast";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { signOut } = useAuth();
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
      <header className="bg-[#1a1210] border-b border-[#2e1f1a] sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="font-display font-extrabold text-base tracking-tight text-white">
              PRESCOT <span className="text-brand">MOBILES</span>
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand/20 text-brand text-[10px] font-extrabold uppercase tracking-wide">
              Store Operations ERP
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-xs font-medium text-[#c8b8ae] hover:text-white transition-colors"
            >
              View Website
            </Link>
            <button
              onClick={handleSignOut}
              className="text-xs font-bold text-brand hover:text-rose-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Top Bar Navigation */}
        <DashboardSidebar />
      </header>

      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4 md:p-6 overflow-auto min-w-0 w-full max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
