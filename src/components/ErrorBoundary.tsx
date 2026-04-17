import { Component, ReactNode } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // TODO: integrar com serviço de monitoramento (Sentry, etc.)
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  goHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="font-display text-3xl font-semibold">Algo deu errado</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Detectamos um erro inesperado. Tente recarregar a página. Se o problema persistir,
            entre em contato com o suporte.
          </p>
          {isDev && this.state.error && (
            <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-left text-[11px] text-muted-foreground">
              {this.state.error.message}
              {"\n"}
              {this.state.error.stack}
            </pre>
          )}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={this.reset} className="gap-2">
              <RotateCw className="h-4 w-4" />
              Recarregar página
            </Button>
            <Button variant="outline" onClick={this.goHome} className="gap-2">
              <Home className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
