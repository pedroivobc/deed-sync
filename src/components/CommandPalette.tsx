import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ArrowRight,
  Briefcase,
  Clock,
  FileText,
  Home,
  LogOut,
  Moon,
  Plus,
  Settings,
  Star,
  StarOff,
  Sun,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { SERVICE_TYPE_LABEL } from "@/lib/serviceUi";

/* -------------------------------------------------------------------------- */
/*  Types & storage                                                            */
/* -------------------------------------------------------------------------- */

type ResultGroup = "Clientes" | "Serviços" | "Documentos";

interface SearchResult {
  id: string;
  group: ResultGroup;
  label: string;
  hint?: string;
  to: string;
  /** stable key for favorites/recents */
  key: string;
}

const RECENT_KEY = "clemente-cmdk-recent";
const FAVORITE_KEY = "clemente-cmdk-favorites";
const MAX_RECENT = 6;

function loadList(key: string): SearchResult[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => x && typeof x.key === "string") : [];
  } catch {
    return [];
  }
}
function saveList(key: string, list: SearchResult[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/* -------------------------------------------------------------------------- */
/*  Highlight                                                                  */
/* -------------------------------------------------------------------------- */

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary/20 px-0.5 text-foreground">
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Quick actions                                                              */
/* -------------------------------------------------------------------------- */

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  /** keywords used to surface this action when typing */
  keywords: string[];
  run: () => void;
  show?: () => boolean;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const [recents, setRecents] = useState<SearchResult[]>(() => loadList(RECENT_KEY));
  const [favorites, setFavorites] = useState<SearchResult[]>(() => loadList(FAVORITE_KEY));

  const navigate = useNavigate();
  const { user, signOut, theme, setTheme } = useAuth();
  const { can } = usePermissions();

  /* ---------------- Open/close ---------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("command-palette:open", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("command-palette:open", onOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebounced("");
      setResults([]);
    }
  }, [open]);

  /* ---------------- Debounce ---------------- */

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  /* ---------------- Search ---------------- */

  useEffect(() => {
    if (!user || debounced.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const term = `%${debounced}%`;
    (async () => {
      const [clientsRes, servicesRes, filesRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name, email, cpf_cnpj")
          .or(`name.ilike.${term},email.ilike.${term},cpf_cnpj.ilike.${term}`)
          .limit(6),
        supabase
          .from("services")
          .select("id, subject, type, client:clients(name)")
          .ilike("subject", term)
          .limit(6),
        supabase
          .from("drive_files")
          .select("id, file_name, service_id, client_id")
          .ilike("file_name", term)
          .limit(6),
      ]);
      if (cancelled) return;

      const out: SearchResult[] = [
        ...(clientsRes.data ?? []).map((c) => ({
          id: c.id,
          key: `client:${c.id}`,
          group: "Clientes" as const,
          label: c.name,
          hint: c.email ?? c.cpf_cnpj ?? undefined,
          to: `/crm?client=${c.id}`,
        })),
        ...((servicesRes.data ?? []) as Array<{
          id: string;
          subject: string;
          type: keyof typeof SERVICE_TYPE_LABEL;
          client: { name: string } | null;
        }>).map((s) => ({
          id: s.id,
          key: `service:${s.id}`,
          group: "Serviços" as const,
          label: s.subject,
          hint: [SERVICE_TYPE_LABEL[s.type], s.client?.name].filter(Boolean).join(" • "),
          to: `/servicos?service=${s.id}`,
        })),
        ...(filesRes.data ?? []).map((f) => ({
          id: f.id,
          key: `file:${f.id}`,
          group: "Documentos" as const,
          label: f.file_name,
          hint: f.service_id ? "Vinculado a um serviço" : f.client_id ? "Vinculado a um cliente" : "Documento",
          to: f.service_id ? `/servicos?service=${f.service_id}` : "/servicos",
        })),
      ];
      setResults(out);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, user]);

  /* ---------------- Helpers ---------------- */

  const grouped = useMemo(() => {
    const g: Record<ResultGroup, SearchResult[]> = {
      Clientes: [],
      Serviços: [],
      Documentos: [],
    };
    results.forEach((r) => g[r.group].push(r));
    return g;
  }, [results]);

  const pushRecent = useCallback((item: SearchResult) => {
    setRecents((prev) => {
      const next = [item, ...prev.filter((r) => r.key !== item.key)].slice(0, MAX_RECENT);
      saveList(RECENT_KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (key: string) => favorites.some((f) => f.key === key),
    [favorites],
  );
  const toggleFavorite = useCallback((item: SearchResult) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.key === item.key);
      const next = exists ? prev.filter((f) => f.key !== item.key) : [item, ...prev].slice(0, 12);
      saveList(FAVORITE_KEY, next);
      return next;
    });
  }, []);

  const go = useCallback(
    (item: SearchResult) => {
      pushRecent(item);
      setOpen(false);
      navigate(item.to);
    },
    [navigate, pushRecent],
  );

  const goPath = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate],
  );

  /* ---------------- Quick actions ---------------- */

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        id: "new-service",
        label: "Novo serviço",
        icon: Plus,
        hint: "Abrir formulário de novo processo",
        keywords: ["novo", "criar", "adicionar", "serviço", "processo", "new"],
        run: () => goPath("/servicos?new=1"),
      },
      {
        id: "new-client",
        label: "Cadastrar cliente",
        icon: Plus,
        hint: "Abrir formulário de novo cliente",
        keywords: ["novo", "criar", "adicionar", "cliente", "cadastrar", "new"],
        run: () => goPath("/crm?new=1"),
      },
      {
        id: "new-finance",
        label: "Novo lançamento financeiro",
        icon: Plus,
        hint: "Receita ou despesa",
        keywords: ["novo", "criar", "lançamento", "financeiro", "receita", "despesa"],
        show: () => can("access_financial"),
        run: () => goPath("/financeiro?new=1"),
      },
      {
        id: "open-last-service",
        label: "Abrir último serviço acessado",
        icon: ArrowRight,
        hint: recents.find((r) => r.group === "Serviços")?.label,
        keywords: ["abrir", "último", "ultimo", "serviço", "recente"],
        show: () => recents.some((r) => r.group === "Serviços"),
        run: () => {
          const last = recents.find((r) => r.group === "Serviços");
          if (last) go(last);
        },
      },
      {
        id: "go-dashboard",
        label: "Ir para Dashboard",
        icon: Home,
        keywords: ["ir", "dashboard", "início", "home"],
        run: () => goPath("/"),
      },
      {
        id: "go-crm",
        label: "Ir para CRM",
        icon: Users,
        keywords: ["ir", "crm", "clientes"],
        run: () => goPath("/crm"),
      },
      {
        id: "go-services",
        label: "Ir para Serviços",
        icon: Briefcase,
        keywords: ["ir", "serviços", "processos"],
        run: () => goPath("/servicos"),
      },
      {
        id: "go-finance",
        label: "Ir para Financeiro",
        icon: Wallet,
        keywords: ["ir", "financeiro", "caixa"],
        show: () => can("access_financial"),
        run: () => goPath("/financeiro"),
      },
      {
        id: "go-settings",
        label: "Ir para Configurações",
        icon: Settings,
        keywords: ["ir", "configurações", "settings", "preferências"],
        run: () => goPath("/configuracoes"),
      },
      {
        id: "toggle-theme",
        label: theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro",
        icon: theme === "dark" ? Sun : Moon,
        keywords: ["tema", "theme", "dark", "claro", "escuro", "alternar"],
        run: () => {
          setTheme(theme === "dark" ? "light" : "dark");
          setOpen(false);
        },
      },
      {
        id: "logout",
        label: "Sair da conta",
        icon: LogOut,
        keywords: ["sair", "logout", "desconectar"],
        run: () => {
          setOpen(false);
          signOut();
        },
      },
    ],
    [recents, theme, can, go, goPath, signOut, setTheme],
  );

  const visibleActions = quickActions.filter((a) => (a.show ? a.show() : true));

  // Highlight quick actions when the query matches one of their keywords.
  const matchedActions = useMemo(() => {
    const q = debounced.toLowerCase();
    if (q.length < 2) return [];
    return visibleActions.filter((a) =>
      a.keywords.some((k) => k.includes(q) || q.includes(k)),
    );
  }, [debounced, visibleActions]);

  /* ---------------- Render ---------------- */

  const showEmptyState = query.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[15%] max-w-2xl translate-y-0 overflow-hidden p-0 shadow-2xl sm:rounded-xl"
      >
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground">
          <CommandInput
            placeholder="Buscar clientes, serviços, documentos ou comandos…"
            value={query}
            onValueChange={setQuery}
            className="h-14 text-base"
          />
          <CommandList className="max-h-[460px]">
            <CommandEmpty>
              {loading
                ? "Buscando…"
                : debounced.length >= 2
                  ? "Nenhum resultado encontrado."
                  : "Digite ao menos 2 caracteres."}
            </CommandEmpty>

            {/* Suggested quick actions when typing matching keywords */}
            {matchedActions.length > 0 && (
              <>
                <CommandGroup heading="Ações sugeridas">
                  {matchedActions.map((a) => (
                    <ActionItem key={a.id} action={a} term={debounced} />
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Search results */}
            {(["Clientes", "Serviços", "Documentos"] as const).map((g) => {
              const items = grouped[g];
              if (items.length === 0) return null;
              return (
                <CommandGroup key={g} heading={`${g} (${items.length})`}>
                  {items.map((item) => (
                    <ResultRow
                      key={item.key}
                      item={item}
                      term={debounced}
                      favorited={isFavorite(item.key)}
                      onSelect={() => go(item)}
                      onToggleFavorite={() => toggleFavorite(item)}
                    />
                  ))}
                </CommandGroup>
              );
            })}

            {/* Empty-state surfaces: favorites + recents */}
            {showEmptyState && favorites.length > 0 && (
              <CommandGroup heading="Favoritos">
                {favorites.map((item) => (
                  <ResultRow
                    key={`fav-${item.key}`}
                    item={item}
                    term=""
                    favorited
                    onSelect={() => go(item)}
                    onToggleFavorite={() => toggleFavorite(item)}
                  />
                ))}
              </CommandGroup>
            )}

            {showEmptyState && recents.length > 0 && (
              <>
                {favorites.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Acessos recentes">
                  {recents.map((item) => (
                    <ResultRow
                      key={`rec-${item.key}`}
                      item={item}
                      term=""
                      favorited={isFavorite(item.key)}
                      onSelect={() => go(item)}
                      onToggleFavorite={() => toggleFavorite(item)}
                      icon={Clock}
                    />
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Always-available quick actions */}
            {(showEmptyState || debounced.length < 2) && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Ações rápidas">
                  {visibleActions.slice(0, 6).map((a) => (
                    <ActionItem key={a.id} action={a} term="" />
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>

          {/* Footer hints */}
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> navegar</span>
              <span><Kbd>↵</Kbd> abrir</span>
              <span><Kbd>esc</Kbd> fechar</span>
            </div>
            <span className="hidden sm:inline">
              <Kbd>{navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}</Kbd> <Kbd>K</Kbd> para abrir
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subcomponents                                                              */
/* -------------------------------------------------------------------------- */

const GROUP_ICON: Record<ResultGroup, React.ComponentType<{ className?: string }>> = {
  Clientes: User,
  Serviços: Briefcase,
  Documentos: FileText,
};

function ResultRow({
  item,
  term,
  favorited,
  onSelect,
  onToggleFavorite,
  icon,
}: {
  item: SearchResult;
  term: string;
  favorited: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const Icon = icon ?? GROUP_ICON[item.group];
  return (
    <CommandItem value={item.key} onSelect={onSelect} className="group gap-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          <Highlight text={item.label} term={term} />
        </div>
        {item.hint && (
          <div className="truncate text-xs text-muted-foreground">
            <Highlight text={item.hint} term={term} />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={cn(
          "rounded p-1 opacity-0 transition group-hover:opacity-100 hover:bg-accent",
          favorited && "opacity-100 text-amber-500",
        )}
        aria-label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        title={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        {favorited ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
      </button>
    </CommandItem>
  );
}

function ActionItem({ action, term }: { action: QuickAction; term: string }) {
  const Icon = action.icon;
  return (
    <CommandItem value={`action-${action.id}`} onSelect={action.run} className="gap-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          <Highlight text={action.label} term={term} />
        </div>
        {action.hint && (
          <div className="truncate text-xs text-muted-foreground">{action.hint}</div>
        )}
      </div>
    </CommandItem>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
      {children}
    </kbd>
  );
}
