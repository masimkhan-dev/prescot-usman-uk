import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "staff" | "technician" | null;

interface AuthContextType {
  user: User | null;
  role: AppRole;
  isLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isTechnician: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchUserRole(userId: string): Promise<AppRole> {
    try {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);

      if (!data || data.length === 0) return null;
      // Prioritize admin > staff > technician
      const roles = data.map((r) => r.role as string);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("staff")) return "staff";
      if (roles.includes("technician")) return "technician";
      return null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      setUser(u);
      if (u) {
        const r = await fetchUserRole(u.id);
        setRole(r);
      } else {
        setRole(null);
      }
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const r = await fetchUserRole(u.id);
        setRole(r);
      } else {
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  const isAdmin = role === "admin";
  const isStaff = role === "admin" || role === "staff";
  const isTechnician = role === "admin" || role === "staff" || role === "technician";

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        isAdmin,
        isStaff,
        isTechnician,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
