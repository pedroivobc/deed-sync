import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404: rota inexistente acessada:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <p className="font-display text-[140px] font-bold leading-none text-accent sm:text-[180px]">
          404
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          Página não encontrada
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida. Verifique o endereço ou volte
          ao Dashboard.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link to="/" className="gap-2">
              <Home className="h-4 w-4" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
