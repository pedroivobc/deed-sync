import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  BarChart3, Calculator, CalendarDays, TrendingUp, Trophy,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CalculationHeader } from "@/components/calculo-na-mao/shared/CalculationHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/financeiro/KpiCard";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { formatBRL } from "@/lib/money";
import type { Database } from "@/integrations/supabase/types";

type CalculoRow = Database["public"]["Tables"]["calculos"]["Row"];
type Periodo = "7d" | "30d" | "90d" | "12m" | "all";

const TIPO_LABEL: Record<string, string> = {
  valor_venal: "Valor Venal",
  escritura: "Escritura",
  doacao: "Doação",
  correcao_incc: "Correção INCC",
  financiamento_caixa: "Fin. Caixa",
  financiamento_privado: "Fin. Privado",
  regularizacao: "Regularização",
};

const TIPO_COLORS: Record<string, string> = {
  valor_venal: "hsl(var(--stage-entrada))",
  escritura: "hsl(var(--stage-documentacao))",
  doacao: "hsl(var(--stage-analise))",
  correcao_incc: "hsl(var(--stage-execucao))",
  financiamento_caixa: "hsl(var(--stage-revisao))",
  financiamento_privado: "hsl(var(--stage-concluido))",
  regularizacao: "hsl(var(--primary))",
};

const PERIODO_DAYS: Record<Periodo, number | null> = {
  "7d": 7, "30d": 30, "90d": 90, "12m": 365, all: null,
};

const MONTH_LABEL_FMT = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function buildLast12Months(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = startOfMonth(new Date());
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: monthKey(d), label: MONTH_LABEL_FMT.format(d).replace(".", "") });
  }
  return out;
}

export default function AnalyticsRoute() {
  const { user, isAdmin } = useAuth();
  const { roles } = usePermissions();
  const isManager = isAdmin || roles.includes("gerente");

  const [periodo, setPeriodo] = useState<Periodo>("90d");
  const [userFilter, setUserFilter] = useState<string>("all");

  const effectiveUserId = isManager ? (userFilter === "all" ? null : userFilter) : (user?.id ?? null);

  const { data: calculos = [], isLoading } = useQuery({
    queryKey: ["analytics-calculos", periodo, effectiveUserId],
    queryFn: async () => {
      let q = supabase.from("calculos").select("*").order("created_at", { ascending: false });
      const days = PERIODO_DAYS[periodo];
      if (days !== null) {
        const since = new Date(Date.now() - days * 86400_000).toISOString();
        q = q.gte("created_at", since);
      }
      if (effectiveUserId) q = q.eq("user_id", effectiveUserId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CalculoRow[];
    },
    staleTime: 60_000,
  });

  // Buscar 12 meses cheios para gráficos 2 e 3 (independente do período)
  const { data: calculos12m = [] } = useQuery({
    queryKey: ["analytics-calculos-12m", effectiveUserId],
    queryFn: async () => {
      const since = new Date(Date.now() - 365 * 86400_000).toISOString();
      let q = supabase.from("calculos").select("*").gte("created_at", since);
      if (effectiveUserId) q = q.eq("user_id", effectiveUserId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CalculoRow[];
    },
    staleTime: 60_000,
  });

  // Lista de usuários (apenas para admin/gerente)
  const { data: userOptions = [] } = useQuery({
    queryKey: ["analytics-users"],
    queryFn: async () => {
      const { data: cs } = await supabase.from("calculos").select("user_id");
      const ids = Array.from(new Set((cs ?? []).map((c) => c.user_id).filter(Boolean)));
      if (ids.length === 0) return [] as { id: string; name: string }[];
      const { data: profs } = await supabase
        .from("profiles").select("id, name, email").in("id", ids);
      return (profs ?? []).map((p) => ({
        id: p.id, name: p.name ?? p.email ?? p.id.slice(0, 8),
      }));
    },
    enabled: isManager,
    staleTime: 5 * 60_000,
  });

  // ===== KPIs =====
  const totalAllTime = calculos.length; // dentro do período selecionado
  const thisMonthCount = useMemo(() => {
    const start = startOfMonth(new Date()).getTime();
    return calculos.filter((c) => new Date(c.created_at).getTime() >= start).length;
  }, [calculos]);

  const valorVenalMedio90d = useMemo(() => {
    const since = Date.now() - 90 * 86400_000;
    const vv = calculos12m.filter(
      (c) => c.tipo === "valor_venal" && new Date(c.created_at).getTime() >= since && c.valor_total != null,
    );
    if (vv.length === 0) return 0;
    return vv.reduce((s, c) => s + Number(c.valor_total ?? 0), 0) / vv.length;
  }, [calculos12m]);

  const tipoMaisCalculado30d = useMemo(() => {
    const since = Date.now() - 30 * 86400_000;
    const counts: Record<string, number> = {};
    calculos12m
      .filter((c) => new Date(c.created_at).getTime() >= since)
      .forEach((c) => { counts[c.tipo] = (counts[c.tipo] ?? 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? TIPO_LABEL[top[0]] ?? top[0] : "—";
  }, [calculos12m]);

  // ===== Gráfico 1: cálculos por mês (12 meses cheios sobre 'calculos' do período se >=12m, senão por dia agrupado) =====
  const monthlyCounts = useMemo(() => {
    const buckets = buildLast12Months();
    const map = new Map(buckets.map((b) => [b.key, 0]));
    calculos12m.forEach((c) => {
      const d = new Date(c.created_at);
      const k = monthKey(startOfMonth(d));
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
    });
    return buckets.map((b) => ({ label: b.label, count: map.get(b.key) ?? 0 }));
  }, [calculos12m]);

  // ===== Gráfico 2: distribuição por tipo (no período selecionado) =====
  const tipoDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    calculos.forEach((c) => { counts[c.tipo] = (counts[c.tipo] ?? 0) + 1; });
    return Object.entries(counts).map(([tipo, value]) => ({
      name: TIPO_LABEL[tipo] ?? tipo,
      value,
      color: TIPO_COLORS[tipo] ?? "hsl(var(--muted))",
    }));
  }, [calculos]);
  const totalDist = tipoDistribution.reduce((s, d) => s + d.value, 0);

  // ===== Gráfico 3: valor venal médio mensal (últimos 12 meses) =====
  const valorVenalMonthly = useMemo(() => {
    const buckets = buildLast12Months();
    const sums = new Map<string, { sum: number; n: number }>();
    buckets.forEach((b) => sums.set(b.key, { sum: 0, n: 0 }));
    calculos12m
      .filter((c) => c.tipo === "valor_venal" && c.valor_total != null)
      .forEach((c) => {
        const k = monthKey(startOfMonth(new Date(c.created_at)));
        const cur = sums.get(k);
        if (cur) { cur.sum += Number(c.valor_total); cur.n += 1; }
      });
    return buckets.map((b) => {
      const cur = sums.get(b.key)!;
      return { label: b.label, media: cur.n > 0 ? cur.sum / cur.n : 0 };
    });
  }, [calculos12m]);

  const empty = !isLoading && calculos.length === 0 && calculos12m.length === 0;

  return (
    <AppLayout title="Analytics">
      <div className="space-y-6">
        <CalculationHeader
          icon={BarChart3}
          title="Analytics"
          description="Métricas dos cálculos imobiliários do escritório."
        />

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Período</span>
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="12m">Últimos 12 meses</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isManager && (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Usuário</span>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {userOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {empty ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={BarChart3}
                title="Sem dados para o período selecionado"
                description="Crie seu primeiro cálculo para começar a ver métricas aqui."
              >
                <Link
                  to="/calculo-na-mao/correcao-contratual"
                  className="mt-6 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Criar primeiro cálculo
                </Link>
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard small label="Total no período" value={totalAllTime} isCurrency={false} icon={Calculator} />
              <KpiCard small label="Este mês" value={thisMonthCount} isCurrency={false} icon={CalendarDays} tone="info" />
              <KpiCard small label="Valor venal médio (90d)" value={valorVenalMedio90d} icon={TrendingUp} tone="success" />
              <KpiCard small label="Mais calculado (30d)" value={tipoMaisCalculado30d} isCurrency={false} icon={Trophy} tone="warning" />
            </div>

            {/* Gráficos */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Cálculos por mês</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyCounts} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                      />
                      <Bar dataKey="count" name="Cálculos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Distribuição por tipo</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={tipoDistribution.length ? tipoDistribution : [{ name: "Sem dados", value: 1, color: "hsl(var(--muted))" }]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={90}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      >
                        {(tipoDistribution.length ? tipoDistribution : [{ color: "hsl(var(--muted))" }]).map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      {tipoDistribution.length > 0 && (
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                          formatter={(v: number, name: string) => [
                            `${v} (${((v / totalDist) * 100).toFixed(1)}%)`, name,
                          ]}
                        />
                      )}
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Valor venal médio mensal</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={valorVenalMonthly} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                        formatter={(v: number) => formatBRL(v)}
                      />
                      <Line
                        type="monotone"
                        dataKey="media"
                        name="Valor venal médio"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "hsl(var(--primary))" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}