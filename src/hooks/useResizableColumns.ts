import { useCallback, useEffect, useRef, useState } from "react";

export type ColumnWidths = Record<string, number>;

interface Options {
  storageKey: string;
  defaults: ColumnWidths;
  min?: number;
  max?: number;
}

/**
 * Manages persisted, user-resizable column widths.
 * Returns a `getProps(columnId)` factory that wires up an invisible drag handle
 * on the right edge of a header cell.
 */
export function useResizableColumns({ storageKey, defaults, min = 80, max = 800 }: Options) {
  const [widths, setWidths] = useState<ColumnWidths>(() => {
    if (typeof window === "undefined") return defaults;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as ColumnWidths;
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });

  // Keep latest widths in a ref so pointer handlers don't need to be re-created on each move.
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  // Persist (debounced via rAF) when widths change.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(widths));
      } catch {
        // ignore quota errors
      }
    });
    return () => cancelAnimationFrame(id);
  }, [widths, storageKey]);

  const startResize = useCallback(
    (columnId: string, e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = widthsRef.current[columnId] ?? defaults[columnId] ?? 120;
      const target = e.currentTarget;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        const next = Math.max(min, Math.min(max, startWidth + (ev.clientX - startX)));
        setWidths((prev) => (prev[columnId] === next ? prev : { ...prev, [columnId]: next }));
      };
      const onUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [defaults, min, max],
  );

  const getWidth = useCallback(
    (columnId: string) => widths[columnId] ?? defaults[columnId] ?? 120,
    [widths, defaults],
  );

  const reset = useCallback(() => {
    setWidths(defaults);
  }, [defaults]);

  return { widths, getWidth, startResize, reset };
}