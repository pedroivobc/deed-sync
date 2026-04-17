import { ReactNode } from "react";

// AUTENTICAÇÃO TEMPORARIAMENTE DESATIVADA - acesso livre a todas as rotas
export function ProtectedRoute({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
