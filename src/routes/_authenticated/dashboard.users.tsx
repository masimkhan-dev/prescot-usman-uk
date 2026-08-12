import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, setUserRole, removeUserRole } from "@/lib/users.functions";
import { useAuth } from "@/lib/auth-context";
import { toastSuccess, toastError } from "@/lib/toast";
import { PageHelpButton } from "@/components/dashboard/PageHelpButton";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { Loader2, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/users")({
  component: UsersPage,
});

function UsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const listUsersFn = useServerFn(listUsers);
  const setRoleFn = useServerFn(setUserRole);
  const removeRoleFn = useServerFn(removeUserRole);
  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsersFn(),
    staleTime: 1000 * 60 * 10, // 10 mins cache
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function toggleRole(
    userId: string,
    role: "admin" | "staff" | "technician",
    hasRole: boolean,
  ) {
    if (userId === user?.id) {
      toastError("You cannot change your own roles. Ask another admin.");
      return;
    }
    const key = `${userId}-${role}`;
    setSavingKey(key);
    try {
      if (hasRole) {
        await removeRoleFn({ data: { user_id: userId, role } });
        toastSuccess(`Role '${role}' removed`);
      } else {
        await setRoleFn({ data: { user_id: userId, role } });
        toastSuccess(`Role '${role}' granted`);
      }
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err: unknown) {
      toastError(err, "Role update failed");
    } finally {
      setSavingKey(null);
    }
  }

  if (error) {
    return (
      <div className="p-4 text-destructive bg-destructive/8 rounded-xl text-xs font-bold border border-destructive/20">
        Access denied: admin only.
      </div>
    );
  }

  return (
    <div className="db-page space-y-6">
      <div className="db-page-header">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand" />
          <h1 className="db-page-title">Staff Accounts &amp; Roles</h1>
          <PageHelpButton
            pageTitle="Staff Accounts"
            pageKey="users"
            steps={[
              "Admin can add staff and control access.",
              "Click any role badge to toggle permissions on or off.",
              "Only give staff members the permissions they need.",
            ]}
            firstTimeTip="Tip: Click role badges to grant or remove access permissions for staff members."
          />
        </div>
        <p className="db-page-subtitle">Manage staff, technician and admin access permissions.</p>
      </div>

      <div className="db-card !p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={3} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="db-table min-w-[550px]">
              <thead>
                <tr>
                  <th className="db-th">Email</th>
                  <th className="db-th">Name</th>
                  <th className="db-th">Roles</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((u) => {
                  const roles =
                    (u.user_roles as { role: string }[] | null)?.map((r) => r.role) || [];
                  const isSelf = u.user_id === user?.id;
                  return (
                    <tr key={u.id} className="db-tr-hover">
                      <td className="db-td font-medium text-ink">
                        {u.email}
                        {isSelf && (
                          <span className="ml-2 text-[9px] font-bold bg-brand/10 text-brand px-1.5 py-0.5 rounded-full">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="db-td text-muted-foreground">{u.full_name || "—"}</td>
                      <td className="db-td">
                        <div className="flex flex-wrap gap-2">
                          {(["admin", "staff", "technician"] as const).map((role) => {
                            const key = `${u.user_id}-${role}`;
                            const isActive = roles.includes(role);
                            const isSaving = savingKey === key;
                            return (
                              <button
                                key={role}
                                onClick={() => toggleRole(u.user_id, role, isActive)}
                                disabled={isSaving || isSelf}
                                aria-label={`${isActive ? "Remove" : "Grant"} ${role} role for ${u.email}`}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-all capitalize disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                  isActive
                                    ? "bg-brand text-white border-brand shadow-sm"
                                    : "border-border text-muted-foreground hover:border-brand hover:text-brand"
                                }`}
                              >
                                {isSaving ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  isActive && <Shield className="w-2.5 h-2.5" />
                                )}
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
