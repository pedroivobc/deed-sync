import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatBRL } from "@/lib/money";

interface Slice { name: string; value: number; color: string; }
interface Props { data: Slice[]; }

export function RevenueByServiceChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const empty = total === 0;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={empty ? [{ name: "Sem dados", value: 1, color: "hsl(var(--muted))" }] : data}
          dataKey="value"
          nameKey="name"
          cx="40%"
          cy="50%"
          innerRadius={55}
          outerRadius={95}
          stroke="hsl(var(--background))"
          strokeWidth={2}
        >
          {(empty ? [{ color: "hsl(var(--muted))" }] : data).map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        {!empty && (
          <Tooltip
            contentStyle={{ background: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
            formatter={(v: number, name: string) => [
              `${formatBRL(v)} (${((v / total) * 100).toFixed(1)}%)`, name,
            ]}
          />
        )}
        <Legend
          verticalAlign="middle"
          align="right"
          layout="vertical"
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value: string, entry: { payload?: Slice }) => {
            const v = entry?.payload?.value ?? 0;
            const pct = total ? ((v / total) * 100).toFixed(0) : "0";
            return `${value} — ${formatBRL(v)} (${pct}%)`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
