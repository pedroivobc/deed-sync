import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Briefcase,
  Home,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  id: string;
  label: string;
  hint?: string;
  group: "Clientes" | "Serviços";
  to: string;
}

/**
 * Global command palette (Cmd/Ctrl + K).
 * Includes quick commands + debounced search across clients & services.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signOut, theme, setTheme } = useAuth();
  const { can } = usePermissions();

  // Toggle on Cmd/Ctrl + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebounced("");
      setResults([]);
    }
  }, [open]);

  // Debounce input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Run search
  useEffect(() => {
    if (!user || debounced.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const term = `%${debounced}%`;
      const [{ data: clients }, { data: services }] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name, email")
          .or(`name.ilike.${term},email.ilike.${term},cpf_cnpj.ilike.${term}`)
          .limit(5),
        supabase
          .from("services")
          .select("id, subject, type")
          .ilike("subject", term)
          .limit(5),
      ]);
      if (cancelled) return;
      const out: SearchResult[] = [
        ...(clients ?? []).map((c) => ({
          id: c.id,
          label: c.name,
          hint: c.email ?? undefined,
          group: "Clientes" as const,
          to: "/crm",
        })),
        ...(services ?? []).map((s) => ({
          id: s.id,
          label: s.subject,
          hint: s.type,
          group: "Serviços" as const,
          to: "/servicos",
        })),
      ];
      setResults(out);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, user]);

  const grouped = useMemo(() => {
    const g: Record<string, SearchResult[]> = {};
    results.forEach((r) => {
      (g[r.group] ||= []).push(r);
    });
    return g;
  }, [results]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar clientes, serviços ou comandos..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Buscando..." : debounced.length >= 2 ? "Nenhum resultado." : "Digite para buscar."}
        </CommandEmpty>

        <CommandGroup heading="Comandos rápidos">
          <CommandItem onSelect={() => go("/")}>
            <Home className="mr-2 h-4 w-4" /> Ir para Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/crm")}>
            <Users className="mr-2 h-4 w-4" /> Ir para CRM
          </CommandItem>
          <CommandItem onSelect={() => go("/servicos")}>
            <Briefcase className="mr-2 h-4 w-4" /> Ir para Serviços
          </CommandItem>
          {can("access_financial") && (
            <CommandItem onSelect={() => go("/financeiro")}>
              <Wallet className="mr-2 h-4 w-4" /> Ir para Financeiro
            </CommandItem>
          )}
          <CommandItem onSelect={() => go("/configuracoes")}>
            <Settings className="mr-2 h-4 w-4" /> Configurações
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ações">
          <CommandItem onSelect={() => go("/crm?new=1")}>
            <Plus className="mr-2 h-4 w-4" /> Novo cliente
          </CommandItem>
          <CommandItem onSelect={() => go("/servicos?new=1")}>
            <Plus className="mr-2 h-4 w-4" /> Novo serviço
          </CommandItem>
          {can("access_financial") && (
            <CommandItem onSelect={() => go("/financeiro?new=1")}>
              <Plus className="mr-2 h-4 w-4" /> Novo lançamento
            </CommandItem>
          )}
          <CommandItem
            onSelect={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              setOpen(false);
            }}
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            Alternar tema
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              signOut();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </CommandItem>
        </CommandGroup>

        {Object.entries(grouped).map(([group, items]) => (
          <CommandGroup key={group} heading={`${group} (${items.length})`}>
            {items.map((r) => (
              <CommandItem key={r.id} onSelect={() => go(r.to)}>
                <span className="flex-1 truncate">{r.label}</span>
                {r.hint && (
                  <span className="ml-2 truncate text-xs text-muted-foreground">{r.hint}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
