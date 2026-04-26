import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Briefcase,
  Users,
  Wallet,
  Calendar as CalendarIcon,
  ArrowRight,
  CheckCircle2,
  Clock,
  ListChecks,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STAGE_LABEL, type ServiceStage } from "@/lib/serviceUi";

interface ServiceRow {
  id: string;
  subject: string;
  stage: ServiceStage;
  created_at: string;
  completed_at: string | null;
}

const QUICK_LINKS = [
  { to: "/servicos", label: "Serviços", icon: Briefcase, description: "Gerenciar processos" },
  { to: "/crm", label: "CRM", icon: Users, description: "Clientes e contatos" },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, description: "Receitas e despesas" },
  { to: "/agenda", label: "Agenda", icon: CalendarIcon, description: "Compromissos" },
];

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("services")
        .select("id, subject, stage, created_at, completed_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!mounted) return;
      setServices((data ?? []) as ServiceRow[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const total = services.length;
    const concluidos = services.filter((s) => s.stage === "concluido").length;
    const pendentes = total - concluidos;
    return { total, concluidos, pendentes };
  }, [services]);

  const recent = useMemo(() => services.slice(0, 8), [services]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const userName =
    profile?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "usuário";

  return (
    <AppLayout title="Início">
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* Quick access */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_LINKS.map(({ to, label, icon: Icon, description }) => (
            <Link key={to} to={to} className="group">
              <Card className="p-4 h-full transition-colors hover:bg-accent/50 hover:border-primary/40">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total de serviços</div>
                <div className="text-2xl font-semibold mt-1">
                  {loading ? "…" : summary.total}
                </div>
              </div>
              <ListChecks className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Pendentes</div>
                <div className="text-2xl font-semibold mt-1">
                  {loading ? "…" : summary.pendentes}
                </div>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Concluídos</div>
                <div className="text-2xl font-semibold mt-1">
                  {loading ? "…" : summary.concluidos}
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </div>

        {/* Recent services */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Últimos serviços</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/servicos">
                Ver todos <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Carregando…
            </div>
          ) : recent.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Nenhum serviço cadastrado ainda.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/servicos"
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-accent/40 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.subject}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(s.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {STAGE_LABEL[s.stage] ?? s.stage}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
