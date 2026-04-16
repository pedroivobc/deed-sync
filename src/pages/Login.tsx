import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

type Mode = "login" | "reset";

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Credenciais inválidas." : error.message);
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate("/", { replace: true });
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Enviamos um e-mail com instruções para redefinir sua senha.");
    setMode("login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <Card className="rounded-2xl border-border/60 p-8 shadow-card">
          <div className="mb-6 space-y-1 text-center">
            <h2 className="font-display text-3xl font-semibold">
              {mode === "login" ? "Entrar" : "Recuperar senha"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Acesse o gestor de serviços"
                : "Informe seu e-mail para receber o link"}
            </p>
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
              />
            </div>

            {mode === "login" && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Aguarde..." : mode === "login" ? "Entrar" : "Enviar link"}
            </Button>

            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "reset" : "login")}
              className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {mode === "login" ? "Esqueci minha senha" : "Voltar para o login"}
            </button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Clemente Assessoria
        </p>
      </div>
    </div>
  );
}
