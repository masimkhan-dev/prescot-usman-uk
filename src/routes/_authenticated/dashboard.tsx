import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Top Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display font-extrabold text-base tracking-tight text-ink">
              PRESCOT <span className="text-brand">MOBILES</span>
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-brand/8 text-brand text-[10px] font-bold uppercase tracking-wide">
              Dashboard
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="hidden sm:block text-xs font-medium text-muted-foreground hover:text-ink transition-colors"
            >
              View Website
            </Link>
            <button
              onClick={handleSignOut}
              className="text-xs font-bold text-brand hover:text-primary-hover transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        <DashboardSidebar />
        <main className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
