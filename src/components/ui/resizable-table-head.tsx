import * as React from "react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Props extends React.ThHTMLAttributes<HTMLTableCellElement> {
  width: number;
  onResizeStart: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** When true, hide the resize handle (e.g. on small screens). */
  disableResize?: boolean;
}

/**
 * TableHead with a draggable handle on its right edge.
 * The handle uses `touch-action: none` so dragging works on touch devices too.
 */
export function ResizableTableHead({
  width,
  onResizeStart,
  disableResize,
  className,
  children,
  style,
  ...props
}: Props) {
  return (
    <TableHead
      {...props}
      style={{ width, minWidth: width, maxWidth: width, ...style }}
      className={cn("relative select-none border-r border-border/40 last:border-r-0", className)}
    >
      <div className="truncate pr-2">{children}</div>
      {!disableResize && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar coluna"
          onPointerDown={onResizeStart}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none",
            "transition-colors hover:bg-primary/40 active:bg-primary",
          )}
          style={{ touchAction: "none" }}
        />
      )}
    </TableHead>
  );
}