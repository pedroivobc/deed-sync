import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/money";
import { formatPct, type DreRow } from "@/lib/finance";

interface Props {
  receitas: DreRow[];
  despesas: DreRow[];
}

function VariationCell({ value, isRevenue }: { value: number | null; isRevenue: boolean }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  // For receita: positive = good (green); for despesa: positive = bad (red)
  const good = isRevenue ? value >= 0 : value <= 0;
  return (
    <span className={cn("font-medium", value === 0 ? "text-muted-foreground" : good ? "text-success" : "text-destructive")}>
      {formatPct(value)}
    </span>
  );
}

export function DreTable({ receitas, despesas }: Props) {
  const totalRecCurr = receitas.reduce((s, r) => s + r.current, 0);
  const totalRecPrev = receitas.reduce((s, r) => s + r.previous, 0);
  const totalDespCurr = despesas.reduce((s, r) => s + r.current, 0);
  const totalDespPrev = despesas.reduce((s, r) => s + r.previous, 0);
  const liquidoCurr = totalRecCurr - totalDespCurr;
  const liquidoPrev = totalRecPrev - totalDespPrev;
  const recVar = totalRecPrev === 0 ? null : ((totalRecCurr - totalRecPrev) / Math.abs(totalRecPrev)) * 100;
  const despVar = totalDespPrev === 0 ? null : ((totalDespCurr - totalDespPrev) / Math.abs(totalDespPrev)) * 100;
  const liqVar = liquidoPrev === 0 ? null : ((liquidoCurr - liquidoPrev) / Math.abs(liquidoPrev)) * 100;

  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Categoria</th>
              <th className="px-4 py-3 text-right font-semibold">Período atual</th>
              <th className="px-4 py-3 text-right font-semibold">Período anterior</th>
              <th className="px-4 py-3 text-right font-semibold">Variação</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-success/10">
              <td colSpan={4} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-success">Receitas</td>
            </tr>
            {receitas.map((r) => (
              <tr key={`rec-${r.category}`} className="border-t border-border">
                <td className="px-4 py-2.5">{r.category}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatBRL(r.current)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatBRL(r.previous)}</td>
                <td className="px-4 py-2.5 text-right"><VariationCell value={r.variation} isRevenue /></td>
              </tr>
            ))}
            <tr className="border-t border-border bg-muted/40 font-bold">
              <td className="px-4 py-2.5">Total Receitas</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatBRL(totalRecCurr)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatBRL(totalRecPrev)}</td>
              <td className="px-4 py-2.5 text-right"><VariationCell value={recVar} isRevenue /></td>
            </tr>

            <tr className="bg-destructive/10">
              <td colSpan={4} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-destructive">Despesas</td>
            </tr>
            {despesas.map((r) => (
              <tr key={`desp-${r.category}`} className="border-t border-border">
                <td className="px-4 py-2.5">{r.category}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatBRL(r.current)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatBRL(r.previous)}</td>
                <td className="px-4 py-2.5 text-right"><VariationCell value={r.variation} isRevenue={false} /></td>
              </tr>
            ))}
            <tr className="border-t border-border bg-muted/40 font-bold">
              <td className="px-4 py-2.5">Total Despesas</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatBRL(totalDespCurr)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatBRL(totalDespPrev)}</td>
              <td className="px-4 py-2.5 text-right"><VariationCell value={despVar} isRevenue={false} /></td>
            </tr>

            <tr className="border-t-2 border-foreground/20 bg-accent/20 font-bold">
              <td className="px-4 py-3">Resultado Líquido</td>
              <td className={cn("px-4 py-3 text-right tabular-nums", liquidoCurr >= 0 ? "text-success" : "text-destructive")}>
                {formatBRL(liquidoCurr)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatBRL(liquidoPrev)}</td>
              <td className="px-4 py-3 text-right"><VariationCell value={liqVar} isRevenue /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
