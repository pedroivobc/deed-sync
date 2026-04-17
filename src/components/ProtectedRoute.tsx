import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  /** If provided, user must have at least one of these roles to view. */
  requireRoles?: AppRole[];
}

export function ProtectedRoute({ children, requireRoles }: ProtectedRouteProps) {
  const { user, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireRoles && requireRoles.length > 0) {
    const allowed = requireRoles.some((r) => roles.includes(r));
    if (!allowed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
          <h1 className="font-display text-2xl font-semibold">Acesso restrito</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Você não tem permissão para acessar esta área. Fale com um administrador.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
