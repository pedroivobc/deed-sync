import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Skeletons reutilizáveis e contextuais — espelham a forma do conteúdo
 * final em vez de mostrar barras genéricas.
 */

interface TableSkeletonProps {
  rows?: number;
  cols: number;
  /** Larguras opcionais por coluna (mesmo length que cols). Default: alterna lg/md/sm. */
  widths?: string[];
}

export function TableRowsSkeleton({ rows = 5, cols, widths }: TableSkeletonProps) {
  const w = widths ?? Array.from({ length: cols }).map((_, i) =>
    i === 0 ? "w-40" : i === cols - 1 ? "w-20" : "w-24"
  );
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <TableCell key={c}>
              <Skeleton className={cn("h-4", w[c])} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function KpiCardSkeleton() {
  return (
    <Card className="rounded-2xl p-5 shadow-soft">
      <Skeleton className="mb-3 h-3 w-20" />
      <Skeleton className="mb-2 h-8 w-32" />
      <Skeleton className="h-3 w-24" />
    </Card>
  );
}

interface ChartSkeletonProps {
  height?: number;
  className?: string;
}

export function ChartSkeleton({ height = 300, className }: ChartSkeletonProps) {
  return (
    <div className={cn("relative w-full overflow-hidden rounded-lg", className)} style={{ height }}>
      <Skeleton className="absolute inset-0" />
      {/* fake axis lines */}
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <Skeleton className="h-px w-full opacity-50" />
        <Skeleton className="h-px w-full opacity-50" />
        <Skeleton className="h-px w-full opacity-50" />
        <Skeleton className="h-px w-full opacity-50" />
      </div>
    </div>
  );
}

interface KanbanSkeletonProps {
  columns: number;
  cardsPerColumn?: number;
}

export function KanbanSkeleton({ columns, cardsPerColumn = 3 }: KanbanSkeletonProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {Array.from({ length: columns }).map((_, c) => (
        <div key={c} className="w-[320px] flex-shrink-0 space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          {Array.from({ length: cardsPerColumn }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn(
                "w-full rounded-xl",
                i % 3 === 0 ? "h-24" : i % 3 === 1 ? "h-32" : "h-20"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FormFieldsSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
