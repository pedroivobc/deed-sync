import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthBucket } from "@/lib/finance";
import { formatBRL } from "@/lib/money";

interface Props { data: MonthBucket[]; }

export function RevenueExpenseChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11}
               tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
          formatter={(v: number) => formatBRL(v)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="receita" name="Receita" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
        <Bar dataKey="despesa" name="Despesa" fill="hsl(var(--foreground))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
