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
      <header className="bg-background border-b border-border sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="font-display font-bold text-lg text-ink">
            PRESCOT <span className="text-brand">MOBILES</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-ink">
              View website
            </Link>
            <button onClick={handleSignOut} className="text-sm text-brand font-medium hover:underline">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        <DashboardSidebar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
