import { useCallback, useEffect, useState } from "react";

/**
 * Multi-select state with shift-click range and ctrl/cmd-click toggle support.
 * Items must be passed in their *current visual order* so shift-click can pick a range.
 * Also exposes keyboard navigation (Shift + ArrowUp/ArrowDown) to extend the selection
 * from the last anchor — similar to Gmail / Notion / ClickUp.
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

  /**
   * Keyboard navigation: Shift+ArrowDown / Shift+ArrowUp extend the selection.
   * Escape clears it. Ctrl/Cmd+A selects all visible items.
   * Ignored while focus is in an input/textarea/contenteditable element.
   */
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      // Esc clears any active selection
      if (e.key === "Escape" && selected.size > 0) {
        e.preventDefault();
        setSelected(new Set());
        setLastIndex(null);
        return;
      }

      // Ctrl/Cmd + A → select all visible
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && orderedItems.length > 0) {
        e.preventDefault();
        setSelected(new Set(orderedItems.map((it) => it.id)));
        setLastIndex(orderedItems.length - 1);
        return;
      }

      // Shift + ArrowDown / ArrowUp → extend selection from anchor
      if (e.shiftKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        if (orderedItems.length === 0) return;
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const anchor = lastIndex ?? (dir === 1 ? -1 : orderedItems.length);
        const nextIdx = Math.max(0, Math.min(orderedItems.length - 1, anchor + dir));
        const targetId = orderedItems[nextIdx].id;
        setSelected((s) => {
          const next = new Set(s);
          // Always grow the range — never shrink — to match Gmail/Notion behavior
          next.add(targetId);
          if (lastIndex === null) next.add(orderedItems[Math.max(0, Math.min(orderedItems.length - 1, anchor))]?.id);
          return next;
        });
        setLastIndex(nextIdx);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [orderedItems, lastIndex, selected.size]);

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