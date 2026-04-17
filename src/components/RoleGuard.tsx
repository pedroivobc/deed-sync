import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { usePermissions, type Permission } from "@/hooks/usePermissions";

interface RoleGuardProps {
  children: ReactNode;
  /** Allowed roles (any of). */
  requires?: AppRole[];
  /** Required permissions (all of). Combine with `requires` if both are set. */
  permissions?: Permission[];
  /**
   * If true, redirect to "/" with a toast instead of showing the inline
   * "Acesso restrito" screen. Useful for guarding entire routes.
   */
  redirect?: boolean;
}

/**
 * Wraps protected content. Shows a friendly access-denied screen
 * (or redirects to home) when the current user lacks the required
 * roles/permissions.
 */
export function RoleGuard({ children, requires, permissions, redirect = false }: RoleGuardProps) {
  const { user, roles, loading } = useAuth();
  const { canAll } = usePermissions();
  const location = useLocation();

  const roleOk = !requires || requires.length === 0 || requires.some((r) => roles.includes(r));
  const permOk = !permissions || permissions.length === 0 || canAll(permissions);
  const allowed = roleOk && permOk;

  useEffect(() => {
    if (!loading && user && redirect && !allowed) {
      toast.error("Você não tem permissão para acessar esta área.");
    }
  }, [loading, user, redirect, allowed]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowed) {
    if (redirect) return <Navigate to="/" replace />;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-semibold">Acesso restrito</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Você não tem permissão para visualizar esta área. Fale com um administrador
          se acreditar que isso é um engano.
        </p>
        <Button variant="outline" asChild>
          <a href="/">Voltar para o início</a>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
