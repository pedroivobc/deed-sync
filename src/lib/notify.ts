import { toast } from "sonner";

/**
 * Wrapper padronizado em cima do sonner.
 * - success: 3s
 * - info: 4s
 * - warning: 5s
 * - error: 5s (com botão "Tentar novamente" opcional)
 *
 * Use SEMPRE este helper (não chame `toast.*` direto) para manter
 * consistência de duração, ícones e tom em todo o sistema.
 */

export const notify = {
  success(message: string, description?: string) {
    return toast.success(message, { description, duration: 3000 });
  },

  error(message: string, opts?: { description?: string; retry?: () => void }) {
    return toast.error(message, {
      description: opts?.description,
      duration: 5000,
      action: opts?.retry
        ? { label: "Tentar novamente", onClick: opts.retry }
        : undefined,
    });
  },

  info(message: string, description?: string) {
    return toast.info(message, { description, duration: 4000 });
  },

  warning(message: string, description?: string) {
    return toast.warning(message, { description, duration: 5000 });
  },

  /** Para mensagens neutras / loading */
  loading(message: string) {
    return toast.loading(message);
  },

  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};

/**
 * Traduz erros comuns do Supabase para mensagens amigáveis em pt-BR.
 * Use antes de chamar `notify.error(...)` quando a origem é o backend.
 */
export function humanizeBackendError(err: unknown, fallback = "Erro ao salvar. Verifique os dados e tente novamente."): string {
  if (!err) return fallback;
  const message = typeof err === "string" ? err : (err as { message?: string })?.message ?? "";
  const m = message.toLowerCase();

  if (m.includes("duplicate key") || m.includes("already registered") || m.includes("unique")) {
    return "Registro duplicado: este e-mail ou identificador já existe.";
  }
  if (m.includes("permission denied") || m.includes("rls") || m.includes("policy")) {
    return "Você não tem permissão para realizar esta ação.";
  }
  if (m.includes("network") || m.includes("failed to fetch")) {
    return "Falha na conexão. Verifique sua internet e tente novamente.";
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (m.includes("email not confirmed")) {
    return "E-mail ainda não confirmado.";
  }
  return message || fallback;
}
