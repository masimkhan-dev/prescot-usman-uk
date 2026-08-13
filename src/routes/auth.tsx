import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, signIn, signUp, isLoading } = useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (user) {
    router.navigate({ to: "/dashboard", replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: msg } = isSignUp
      ? await signUp(email, password, fullName)
      : await signIn(email, password);

    if (msg) {
      setError(msg);
      setSubmitting(false);
    } else {
      if (isSignUp) {
        setError("Account created! Please check your email to confirm, then sign in.");
        setIsSignUp(false);
      } else {
        router.navigate({ to: "/dashboard", replace: true });
      }
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-background border-b border-border">
        <div className="container-page py-4">
          <Link to="/" className="font-display font-bold text-xl text-ink">
            PRESCOT <span className="text-brand">MOBILES</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-background border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-ink">
            {isSignUp ? "Create dashboard account" : "Sign in to dashboard"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignUp ? "For staff and admin use only" : "Staff, technicians and admin"}
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-ink">Full name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-ink">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp((v) => !v)}
              className="text-brand font-semibold hover:underline"
            >
              {isSignUp ? "Sign in" : "Create one"}
            </button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            New accounts are created as staff. An admin can upgrade roles in the dashboard.
          </p>
        </div>
      </main>
    </div>
  );
}
