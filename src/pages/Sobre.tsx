import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const VERSION = "1.0.0";
const LAST_UPDATE = "abril de 2026";

export default function Sobre() {
  return (
    <AppLayout title="Sobre o sistema">
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs items={[{ label: "Sobre" }]} />

        <Card className="rounded-2xl p-8 shadow-soft">
          <div className="mb-6 flex items-center justify-between gap-4">
            <Logo />
            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              v{VERSION}
            </span>
          </div>

          <h2 className="font-display text-2xl font-semibold">
            Clemente Assessoria — Gestor de Serviços
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Sistema de gestão de serviços imobiliários da Clemente Assessoria. Centraliza CRM,
            controle de processos (escrituras, regularizações e serviços avulsos) e financeiro
            BPO em um único ambiente, com permissões granulares por perfil.
          </p>

          <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Versão</dt>
              <dd className="mt-1 font-medium">v{VERSION}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Última atualização</dt>
              <dd className="mt-1 font-medium">{LAST_UPDATE}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Stack</dt>
              <dd className="mt-1 font-medium">React · TypeScript · Tailwind · Supabase</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Hospedagem</dt>
              <dd className="mt-1 font-medium">Lovable</dd>
            </div>
          </dl>

          <div className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} Clemente Assessoria. Todos os direitos reservados.
            </p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <a href="#" className="hover:text-foreground">Política de privacidade</a>
              <a href="#" className="hover:text-foreground">Termos de uso</a>
            </p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
