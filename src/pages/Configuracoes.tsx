import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserManagement } from "@/components/UserManagement";
import { PreferencesPanel } from "@/components/PreferencesPanel";
import { AuditLogPanel } from "@/components/AuditLogPanel";
import { IntegrationsPanel } from "@/components/IntegrationsPanel";
import { ClickSignTemplatesPanel } from "@/components/ClickSignTemplatesPanel";

export default function Configuracoes() {
  const { profile, refreshProfile, isAdmin } = useAuth();
  const { can } = usePermissions();
  const canManageUsers = can("manage_users");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setEmail(profile.email ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name, email, phone })
      .eq("id", profile.id);
    if (!error && email !== profile.email) {
      await supabase.auth.updateUser({ email });
    }
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado.");
    await refreshProfile();
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) return toast.error("Mínimo de 6 caracteres.");
    if (newPw !== confirmPw) return toast.error("As senhas não conferem.");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) return toast.error(error.message);
    setNewPw("");
    setConfirmPw("");
    toast.success("Senha atualizada.");
  };

  return (
    <AppLayout title="Configurações">
      <div className={`mx-auto ${canManageUsers ? "max-w-6xl" : "max-w-3xl"}`}>
        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="perfil">Meu Perfil</TabsTrigger>
            <TabsTrigger value="senha">Senha</TabsTrigger>
            <TabsTrigger value="preferencias">Preferências</TabsTrigger>
            {canManageUsers && <TabsTrigger value="usuarios">Gestão de Usuários</TabsTrigger>}
            {isAdmin && <TabsTrigger value="integracoes">Integrações</TabsTrigger>}
            {isAdmin && <TabsTrigger value="templates">Templates</TabsTrigger>}
          </TabsList>

          <TabsContent value="perfil">
            <Card className="rounded-2xl p-6 shadow-soft">
              <h3 className="section-title mb-4">Informações pessoais</h3>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={savingProfile}>
                    {savingProfile ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </div>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="senha">
            <Card className="rounded-2xl p-6 shadow-soft">
              <h3 className="section-title mb-4">Alterar senha</h3>
              <form onSubmit={savePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newpw">Nova senha</Label>
                  <Input id="newpw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmpw">Confirmar nova senha</Label>
                  <Input id="confirmpw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={savingPw}>
                    {savingPw ? "Salvando..." : "Atualizar senha"}
                  </Button>
                </div>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="preferencias">
            <PreferencesPanel />
          </TabsContent>

          {canManageUsers && (
            <TabsContent value="usuarios">
              <Tabs defaultValue="lista" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="lista">Usuários</TabsTrigger>
                  {isAdmin && <TabsTrigger value="auditoria">Log de Auditoria</TabsTrigger>}
                </TabsList>
                <TabsContent value="lista">
                  <UserManagement />
                </TabsContent>
                {isAdmin && (
                  <TabsContent value="auditoria">
                    <AuditLogPanel />
                  </TabsContent>
                )}
              </Tabs>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="integracoes">
              <IntegrationsPanel />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="templates">
              <ClickSignTemplatesPanel />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
