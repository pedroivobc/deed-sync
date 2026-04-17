import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { maskCpfCnpj, maskPhoneBR } from "@/lib/masks";
import { ORIGIN_LABEL } from "@/lib/clientUi";
import { toast } from "sonner";

export interface PickedClient {
  id: string;
  name: string;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
}

interface Props {
  value: PickedClient | null;
  onChange: (c: PickedClient | null) => void;
}

interface NewClientDraft {
  type: "PF" | "PJ";
  name: string;
  cpf_cnpj: string;
  phone: string;
  email: string;
  origin: string;
}

export function ClientPicker({ value, onChange }: Props) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PickedClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<NewClientDraft>({
    type: "PF", name: "", cpf_cnpj: "", phone: "", email: "", origin: "indicacao",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      setLoading(true);
      const q = search.trim();
      let query = supabase
        .from("clients")
        .select("id, name, cpf_cnpj, email, phone")
        .order("name", { ascending: true })
        .limit(20);
      if (q) {
        query = query.or(`name.ilike.%${q}%,cpf_cnpj.ilike.%${q}%,email.ilike.%${q}%`);
      }
      const { data } = await query;
      if (active) {
        setResults((data ?? []) as PickedClient[]);
        setLoading(false);
      }
    }, 200);
    return () => { active = false; clearTimeout(t); };
  }, [search]);

  const createInline = async () => {
    if (!draft.name.trim()) return toast.error("Informe o nome do cliente.");
    setCreating(true);
    const { data, error } = await supabase
      .from("clients")
      .insert({
        type: draft.type as "PF" | "PJ",
        name: draft.name.trim(),
        cpf_cnpj: draft.cpf_cnpj.trim() || null,
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        origin: draft.origin as never,
      })
      .select("id, name, cpf_cnpj, email, phone")
      .single();
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("Cliente criado e vinculado.");
    onChange(data as PickedClient);
    setMode("existing");
  };

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition",
            mode === "existing" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Cliente existente
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition",
            mode === "new" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Cadastrar novo
        </button>
      </div>

      {mode === "existing" ? (
        <div className="space-y-3">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                {value ? value.name : "Buscar cliente por nome, CPF/CNPJ ou e-mail..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Buscar..." value={search} onValueChange={setSearch} />
                <CommandList>
                  {loading && <div className="p-3 text-center text-xs text-muted-foreground">Carregando...</div>}
                  {!loading && results.length === 0 && (
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  )}
                  <CommandGroup>
                    {results.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.id}
                        onSelect={() => { onChange(c); setOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", value?.id === c.id ? "opacity-100" : "opacity-0")} />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{c.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {c.cpf_cnpj ?? "—"} · {c.email ?? c.phone ?? ""}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {value && (
            <Card className="flex items-start justify-between gap-3 border-accent/40 bg-accent/5 p-3">
              <div>
                <div className="font-medium">{value.name}</div>
                <div className="text-xs text-muted-foreground">
                  {value.cpf_cnpj ?? "Sem documento"} · {value.email ?? value.phone ?? "—"}
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)}>
                <X className="h-4 w-4" />
              </Button>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-dashed border-accent/50 bg-accent/5 p-4">
          <p className="text-xs text-muted-foreground">
            ⭐ Novos clientes cadastrados aqui aparecem automaticamente no CRM.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: v as "PF" | "PJ", cpf_cnpj: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">Pessoa Física</SelectItem>
                  <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{draft.type === "PF" ? "CPF" : "CNPJ"}</Label>
              <Input
                value={draft.cpf_cnpj}
                onChange={(e) => setDraft((d) => ({ ...d, cpf_cnpj: maskCpfCnpj(e.target.value, draft.type) }))}
                placeholder={draft.type === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Nome / Razão social *</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: maskPhoneBR(e.target.value) }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Origem</Label>
              <Select value={draft.origin} onValueChange={(v) => setDraft((d) => ({ ...d, origin: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ORIGIN_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={createInline} disabled={creating}>
              {creating ? "Cadastrando..." : "Cadastrar e vincular"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
