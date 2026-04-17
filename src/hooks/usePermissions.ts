import { useCallback, useMemo } from "react";
import { useAuth, type AppRole } from "@/contexts/AuthContext";

/**
 * Permission keys used across the app.
 * Keep this list in sync with the matrix documented in the project notes.
 */
export type Permission =
  // Dashboard
  | "view_dashboard"
  | "view_financial_kpis"
  // CRM
  | "view_clients"
  | "create_client"
  | "edit_client"
  | "delete_client"
  | "view_internal_notes"
  // Serviços
  | "view_services"
  | "create_service"
  | "edit_service"
  | "delete_any_service"
  | "delete_own_service"
  | "view_service_financial"
  // Financeiro
  | "access_financial"
  | "create_finance_entry"
  | "edit_finance_entry"
  | "delete_finance_entry"
  | "export_finance"
  // Configurações
  | "manage_users";

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  administrador: [
    "view_dashboard", "view_financial_kpis",
    "view_clients", "create_client", "edit_client", "delete_client", "view_internal_notes",
    "view_services", "create_service", "edit_service",
    "delete_any_service", "delete_own_service", "view_service_financial",
    "access_financial", "create_finance_entry", "edit_finance_entry",
    "delete_finance_entry", "export_finance",
    "manage_users",
  ],
  gerente: [
    "view_dashboard", "view_financial_kpis",
    "view_clients", "create_client", "edit_client", "delete_client", "view_internal_notes",
    "view_services", "create_service", "edit_service",
    "delete_any_service", "delete_own_service", "view_service_financial",
    "access_financial", "create_finance_entry", "edit_finance_entry",
    "delete_finance_entry", "export_finance",
  ],
  colaborador: [
    "view_dashboard",
    "view_clients", "create_client", "edit_client",
    "view_services", "create_service", "edit_service",
    "delete_own_service",
  ],
};

export interface PermissionsApi {
  /** Roles attached to the current user. */
  roles: AppRole[];
  /** True if the user has the given permission via any of their roles. */
  can: (perm: Permission) => boolean;
  /** True if the user has all listed permissions. */
  canAll: (perms: Permission[]) => boolean;
  /** True if the user has at least one of the listed permissions. */
  canAny: (perms: Permission[]) => boolean;
  /** Convenience: can the current user delete this specific service. */
  canDeleteService: (createdBy: string | null | undefined) => boolean;
  /** Convenience: can the current user delete this specific finance entry. */
  canDeleteFinanceEntry: (createdAt: string | Date) => boolean;
}

export function usePermissions(): PermissionsApi {
  const { roles, user, isAdmin } = useAuth();

  const allowed = useMemo(() => {
    const set = new Set<Permission>();
    roles.forEach((r) => ROLE_PERMISSIONS[r]?.forEach((p) => set.add(p)));
    return set;
  }, [roles]);

  const can = useCallback((p: Permission) => allowed.has(p), [allowed]);
  const canAll = useCallback((ps: Permission[]) => ps.every((p) => allowed.has(p)), [allowed]);
  const canAny = useCallback((ps: Permission[]) => ps.some((p) => allowed.has(p)), [allowed]);

  const canDeleteService = useCallback(
    (createdBy: string | null | undefined) => {
      if (allowed.has("delete_any_service")) return true;
      if (allowed.has("delete_own_service") && createdBy && user?.id === createdBy) return true;
      return false;
    },
    [allowed, user?.id],
  );

  const canDeleteFinanceEntry = useCallback(
    (createdAt: string | Date) => {
      if (!allowed.has("delete_finance_entry")) return false;
      // Admin can delete anything; gerente only entries < 30 days old.
      if (isAdmin) return true;
      const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
      const ageMs = Date.now() - created.getTime();
      return ageMs <= 30 * 24 * 60 * 60 * 1000;
    },
    [allowed, isAdmin],
  );

  return { roles, can, canAll, canAny, canDeleteService, canDeleteFinanceEntry };
}
