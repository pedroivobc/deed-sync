import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { notify, humanizeBackendError } from "@/lib/notify";
import { Skeleton } from "@/components/ui/skeleton";

interface Prefs {
  theme: "light" | "dark" | "auto";
  language: string;
  email_daily_digest: boolean;
  email_overdue_alerts: boolean;
  email_followup_reminders: boolean;
  email_new_assignments: boolean;
  monthly_revenue_goal: string;
  timezone: string;
}

const DEFAULTS: Prefs = {
  theme: "light",
  language: "pt-BR",
  email_daily_digest: false,
  email_overdue_alerts: true,
  email_followup_reminders: true,
  email_new_assignments: true,
  monthly_revenue_goal: "",
  timezone: "America/Sao_Paulo",
};

export function PreferencesPanel() {
  const { user, setTheme } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          theme: (data.theme as Prefs["theme"]) ?? "light",
          language: data.language ?? "pt-BR",
          email_daily_digest: data.email_daily_digest,
          email_overdue_alerts: data.email_overdue_alerts,
          email_followup_reminders: data.email_followup_reminders,
          email_new_assignments: data.email_new_assignments,
          monthly_revenue_goal: data.monthly_revenue_goal != null
            ? String(data.monthly_revenue_goal)
            : "",
          timezone: data.timezone ?? "America/Sao_Paulo",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const update = <K extends keyof Prefs>(k: K, v: Prefs[K]) =>
    setPrefs((p) => ({ ...p, [k]: v }));

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const goal = prefs.monthly_revenue_goal.trim()
      ? Number(prefs.monthly_revenue_goal.replace(",", "."))
      : null;
    const payload = {
      user_id: user.id,
      theme: prefs.theme,
      language: prefs.language,
      email_daily_digest: prefs.email_daily_digest,
      email_overdue_alerts: prefs.email_overdue_alerts,
      email_followup_reminders: prefs.email_followup_reminders,
      email_new_assignments: prefs.email_new_assignments,
      monthly_revenue_goal: goal != null && !Number.isNaN(goal) ? goal : null,
      timezone: prefs.timezone,
    };
    const { error } = await supabase
      .from("user_preferences")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      notify.error(humanizeBackendError(error.message));
      return;
    }
    if (prefs.theme === "light" || prefs.theme === "dark") {
      await setTheme(prefs.theme);
    } else {
      const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      await setTheme(sysDark ? "dark" : "light");
    }
    notify.success("Preferências salvas.");
  };

  if (loading) {
    return (
      <Card className="rounded-2xl p-6 shadow-soft">
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl p-6 shadow-soft">
      <h3 className="section-title mb-4">Preferências</h3>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tema</Label>
          <Select value={prefs.theme} onValueChange={(v) => update("theme", v as Prefs["theme"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Escuro</SelectItem>
              <SelectItem value="auto">Automático (sistema)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Idioma</Label>
          <Select value={prefs.language} onValueChange={(v) => update("language", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Fuso horário</Label>
          <Select value={prefs.timezone} onValueChange={(v) => update("timezone", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="America/Sao_Paulo">America/Sao_Paulo</SelectItem>
              <SelectItem value="America/Manaus">America/Manaus</SelectItem>
              <SelectItem value="America/Recife">America/Recife</SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal">Meta de receita mensal (R$)</Label>
          <Input
            id="goal"
            inputMode="decimal"
            placeholder="Ex.: 25000"
            value={prefs.monthly_revenue_goal}
            onChange={(e) => update("monthly_revenue_goal", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Se preenchido, o Dashboard mostrará o progresso da meta.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h4 className="mb-3 text-sm font-semibold">Notificações por e-mail</h4>
        <div className="space-y-3">
          {[
            { key: "email_daily_digest", label: "Receber resumo diário por e-mail" },
            { key: "email_overdue_alerts", label: "Alertas de prazo vencido" },
            { key: "email_followup_reminders", label: "Follow-ups agendados" },
            { key: "email_new_assignments", label: "Novas atribuições de serviço" },
          ].map((c) => (
            <label key={c.key} className="flex cursor-pointer items-center gap-3 text-sm">
              <Checkbox
                checked={prefs[c.key as keyof Prefs] as boolean}
                onCheckedChange={(v) => update(c.key as keyof Prefs, !!v as never)}
              />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar preferências"}
        </Button>
      </div>
    </Card>
  );
}
