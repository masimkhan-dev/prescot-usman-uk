import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, setUserRole, removeUserRole } from "@/lib/users.functions";
import { Loader2, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/users")({
  component: UsersPage,
});

function UsersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["users"], queryFn: () => listUsers() });
  const setRoleFn = useServerFn(setUserRole);
  const removeRoleFn = useServerFn(removeUserRole);

  async function toggleRole(userId: string, role: "admin" | "staff" | "technician", hasRole: boolean) {
    if (hasRole) await removeRoleFn({ data: { user_id: userId, role } });
    else await setRoleFn({ data: { user_id: userId, role } });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  if (error) {
    return <div className="p-4 text-red-700 bg-red-50 rounded-lg">Access denied: admin only.</div>;
  }

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Users & Roles</h1>
        <p className="text-sm text-muted-foreground">Manage staff, technician and admin access.</p>
      </div>

      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted-foreground text-xs uppercase"><tr><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Roles</th></tr></thead>
          <tbody>
            {data?.map((u) => {
              const roles = (u.user_roles as { role: string }[] | null)?.map((r) => r.role) || [];
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.full_name || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {(["admin", "staff", "technician"] as const).map((role) => (
                        <button
                          key={role}
                          onClick={() => toggleRole(u.user_id, role, roles.includes(role))}
                          className={`px-2 py-1 text-xs rounded-full border ${roles.includes(role) ? "bg-brand text-white border-brand" : "border-border text-muted-foreground"}`}
                        >
                          {roles.includes(role) && <Shield className="w-3 h-3 inline mr-1" />}
                          {role}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
