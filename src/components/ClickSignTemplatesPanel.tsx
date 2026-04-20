import { useEffect, useState } from "react";
import { FileText, Plus, Pencil, Copy, Eye, Power, Loader2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { renderTemplate } from "@/lib/clicksign";

type TemplateType = "procuracao_itbi" | "contrato_assessoria" | "declaracao" | "outro";

interface VarSchema {
  label: string;
  required?: boolean;
  default?: string;
  auto?: string;
}

interface Template {
  id: string;
  name: string;
  type: TemplateType;
  description: string | null;
  content_html: string;
  variables_schema: Record<string, VarSchema>;
  is_active: boolean;
  created_at: string;
}

const TYPE_LABEL: Record<TemplateType, string> = {
  procuracao_itbi: "Procuração ITBI",
  contrato_assessoria: "Contrato de Assessoria",
  declaracao: "Declaração",
  outro: "Outro",
};

const EMPTY_TEMPLATE: Omit<Template, "id" | "created_at"> = {
  name: "",
  type: "outro",
  description: "",
  content_html: "<h1>Título</h1>\n<p>Conteúdo com {{variavel_exemplo}}.</p>",
  variables_schema: { variavel_exemplo: { label: "Variável de exemplo", required: true } },
  is_active: true,
};

export function ClickSignTemplatesPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);

  const reload = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clicksign_templates")
      .select("id,name,type,description,content_html,variables_schema,is_active,created_at")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(`Erro ao carregar templates: ${error.message}`);
      return;
    }
    setTemplates((data ?? []) as unknown as Template[]);
  };

  useEffect(() => { reload(); }, []);

  const handleNew = () => {
    setEditing({
      id: "",
      created_at: "",
      ...EMPTY_TEMPLATE,
    });
  };

  const handleDuplicate = (t: Template) => {
    setEditing({
      ...t,
      id: "",
      created_at: "",
      name: `${t.name} (cópia)`,
    });
  };

  const handleToggleActive = async (t: Template) => {
    const { error } = await supabase
      .from("clicksign_templates")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t.is_active ? "Template desativado." : "Template ativado.");
      reload();
    }
  };

  const handleDelete = async (t: Template) => {
    setConfirmDelete(null);
    const { error } = await supabase.from("clicksign_templates").delete().eq("id", t.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Template excluído.");
      reload();
    }
  };

  const varsCount = (t: Template) =>
    Object.keys(t.variables_schema ?? {}).length;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl p-6 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent/10 p-2">
              <FileText className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h3 className="font-display text-xl">Templates de Documentos</h3>
              <p className="text-sm text-muted-foreground">
                Modelos HTML usados para gerar documentos enviados ao ClickSign.
              </p>
            </div>
          </div>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Template
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Nenhum template cadastrado.
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t.name}</span>
                    {t.is_active ? (
                      <Badge className="bg-success/15 text-success">Ativo</Badge>
                    ) : (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Tipo: <strong>{TYPE_LABEL[t.type]}</strong></span>
                    <span>Variáveis: <strong>{varsCount(t)}</strong></span>
                    {t.description && <span className="line-clamp-1">{t.description}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(t)} className="gap-1">
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(t)} className="gap-1">
                    <Copy className="h-3 w-3" /> Duplicar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPreviewing(t)} className="gap-1">
                    <Eye className="h-3 w-3" /> Testar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleToggleActive(t)} className="gap-1">
                    <Power className="h-3 w-3" /> {t.is_active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(t)}
                    className="gap-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" /> Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editing && (
        <TemplateEditor
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}

      {previewing && (
        <TemplatePreview
          template={previewing}
          onClose={() => setPreviewing(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Excluir template?"
        description={`O template "${confirmDelete?.name}" será removido permanentemente. Envelopes já enviados não serão afetados.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        destructive
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Editor
// ─────────────────────────────────────────────────────────────────

function TemplateEditor({
  template, onClose, onSaved,
}: { template: Template; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(template.name);
  const [type, setType] = useState<TemplateType>(template.type);
  const [description, setDescription] = useState(template.description ?? "");
  const [contentHtml, setContentHtml] = useState(template.content_html);
  const [isActive, setIsActive] = useState(template.is_active);
  const [varsJson, setVarsJson] = useState(
    JSON.stringify(template.variables_schema ?? {}, null, 2),
  );
  const [varsError, setVarsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isNew = !template.id;

  const handleVarsChange = (v: string) => {
    setVarsJson(v);
    try {
      JSON.parse(v);
      setVarsError(null);
    } catch (e) {
      setVarsError(e instanceof Error ? e.message : "JSON inválido");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Informe o nome do template.");
    if (!contentHtml.trim()) return toast.error("Informe o conteúdo HTML.");
    let parsedVars: Record<string, VarSchema>;
    try {
      parsedVars = JSON.parse(varsJson);
    } catch {
      return toast.error("Schema de variáveis com JSON inválido.");
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      type,
      description: description.trim() || null,
      content_html: contentHtml,
      variables_schema: parsedVars,
      is_active: isActive,
    };
    const { error } = isNew
      ? await supabase.from("clicksign_templates").insert(payload)
      : await supabase.from("clicksign_templates").update(payload).eq("id", template.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isNew ? "Template criado." : "Template atualizado.");
    onSaved();
  };

  // Build sample variables from schema for live preview
  const sampleVars: Record<string, string> = {};
  try {
    const parsed = JSON.parse(varsJson) as Record<string, VarSchema>;
    Object.entries(parsed).forEach(([k, v]) => {
      sampleVars[k] = v.default ?? `[${v.label ?? k}]`;
    });
  } catch { /* ignore */ }

  const previewHtml = renderTemplate(contentHtml, sampleVars);

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Novo template" : `Editar: ${template.name}`}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2 lg:grid-cols-2">
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Nome do template <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as TemplateType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <Label className="text-xs">Ativo</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Descrição</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Conteúdo HTML <span className="text-destructive">*</span>{" "}
                <span className="text-muted-foreground">— use {`{{variavel}}`}</span>
              </Label>
              <Textarea
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                rows={12}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Schema de variáveis (JSON) — chaves devem bater com {`{{variavel}}`} no HTML
              </Label>
              <Textarea
                value={varsJson}
                onChange={(e) => handleVarsChange(e.target.value)}
                rows={10}
                className="font-mono text-xs"
              />
              {varsError && <p className="text-xs text-destructive">JSON inválido: {varsError}</p>}
              <p className="text-[11px] text-muted-foreground">
                Formato: {`{ "chave": { "label": "Rótulo", "required": true, "default": "valor", "auto": "today" } }`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Pré-visualização (com dados de exemplo)</p>
            <div
              className="max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-background p-4 text-xs"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !!varsError}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isNew ? "Criar template" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────
// Preview / "Testar"
// ─────────────────────────────────────────────────────────────────

function TemplatePreview({ template, onClose }: { template: Template; onClose: () => void }) {
  const sample: Record<string, string> = {};
  Object.entries(template.variables_schema ?? {}).forEach(([k, v]) => {
    sample[k] = v.default ?? `[${v.label ?? k}]`;
  });
  const html = renderTemplate(template.content_html, sample);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Pré-visualização: {template.name}</DialogTitle>
        </DialogHeader>
        <div
          className="max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-background p-6 text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
