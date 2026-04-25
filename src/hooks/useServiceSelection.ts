import { useCallback, useState } from "react";

/**
 * Multi-select state with shift-click range and ctrl/cmd-click toggle support.
 * Items must be passed in their *current visual order* so shift-click can pick a range.
 */
export function useServiceSelection<T extends { id: string }>(orderedItems: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastIndex, setLastIndex] = useState<number | null>(null);

  const toggle = useCallback((id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    const idx = orderedItems.findIndex((it) => it.id === id);
    if (idx >= 0) setLastIndex(idx);
  }, [orderedItems]);

  /**
   * Click handler tailored for cards/rows. Honors shift / ctrl/meta modifiers.
   * Returns true if it consumed the click (caller should NOT also open the item).
   */
  const handleClick = useCallback(
    (e: React.MouseEvent | { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }, id: string): boolean => {
      const idx = orderedItems.findIndex((it) => it.id === id);

      // Shift+click → range select (only when there is a previous anchor)
      if (e.shiftKey && lastIndex !== null && idx >= 0) {
        const [from, to] = lastIndex < idx ? [lastIndex, idx] : [idx, lastIndex];
        setSelected((s) => {
          const next = new Set(s);
          for (let i = from; i <= to; i++) next.add(orderedItems[i].id);
          return next;
        });
        return true;
      }

      // Ctrl/Cmd+click → toggle this item without losing others
      if (e.ctrlKey || e.metaKey) {
        toggle(id);
        return true;
      }

      // No modifier → not consumed; if there is already a selection,
      // a plain click on a non-selected item will be ignored by the caller logic
      // (we don't auto-select on plain click to keep "click = open" behavior).
      return false;
    },
    [orderedItems, lastIndex, toggle]
  );

  const selectAll = useCallback(() => {
    setSelected(new Set(orderedItems.map((it) => it.id)));
  }, [orderedItems]);

  const clear = useCallback(() => {
    setSelected(new Set());
    setLastIndex(null);
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return {
    selected,
    selectedIds: Array.from(selected),
    count: selected.size,
    isSelected,
    toggle,
    handleClick,
    selectAll,
    clear,
  };
}