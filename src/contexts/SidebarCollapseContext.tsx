import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

type Ctx = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
};

const SidebarCollapseContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "sidebar:collapsed";

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "1") return true;
    if (saved === "0") return false;
    return false;
  });

  // On small screens, force-collapse (without overwriting the user's saved preference).
  useEffect(() => {
    if (isMobile) setCollapsedState(true);
  }, [isMobile]);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const value = useMemo(() => ({ collapsed, toggle, setCollapsed }), [collapsed, toggle, setCollapsed]);

  return (
    <SidebarCollapseContext.Provider value={value}>{children}</SidebarCollapseContext.Provider>
  );
}

export function useSidebarCollapse(): Ctx {
  const ctx = useContext(SidebarCollapseContext);
  if (!ctx) {
    // Safe fallback so components don't crash if accidentally rendered outside the provider.
    return { collapsed: false, toggle: () => {}, setCollapsed: () => {} };
  }
  return ctx;
}