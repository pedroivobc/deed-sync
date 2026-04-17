// Edge function: manage-users
// Handles admin-only create/update/delete of users (auth + profile + role)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AppRole = "administrador" | "gerente" | "colaborador";

interface CreatePayload {
  action: "create";
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: AppRole;
}
interface UpdatePayload {
  action: "update";
  user_id: string;
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: AppRole;
}
interface DeletePayload {
  action: "delete";
  user_id: string;
}
type Payload = CreatePayload | UpdatePayload | DeletePayload;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    // Identify caller
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Sessão inválida" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify caller is administrador
    const { data: roleRows, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    if (roleErr) return json({ error: roleErr.message }, 500);
    const isAdmin = (roleRows ?? []).some((r) => r.role === "administrador");
    if (!isAdmin) return json({ error: "Apenas administradores." }, 403);

    const body = (await req.json()) as Payload;

    if (body.action === "create") {
      const { name, email, phone, password, role } = body;
      if (!name || !email || !password || !role) return json({ error: "Campos obrigatórios ausentes" }, 400);
      if (password.length < 6) return json({ error: "Senha mínima de 6 caracteres" }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, phone },
      });
      if (createErr || !created.user) return json({ error: createErr?.message ?? "Falha ao criar" }, 400);

      const newId = created.user.id;
      // Trigger handle_new_user creates profile + default role; ensure profile fields and target role
      await admin.from("profiles").upsert({ id: newId, name, email, phone: phone ?? null });
      await admin.from("user_roles").delete().eq("user_id", newId);
      await admin.from("user_roles").insert({ user_id: newId, role });

      return json({ ok: true, user_id: newId });
    }

    if (body.action === "update") {
      const { user_id, name, email, phone, password, role } = body;
      if (!user_id) return json({ error: "user_id obrigatório" }, 400);

      const authUpdate: Record<string, unknown> = {};
      if (email) authUpdate.email = email;
      if (password) {
        if (password.length < 6) return json({ error: "Senha mínima de 6 caracteres" }, 400);
        authUpdate.password = password;
      }
      if (Object.keys(authUpdate).length > 0) {
        const { error: updErr } = await admin.auth.admin.updateUserById(user_id, authUpdate);
        if (updErr) return json({ error: updErr.message }, 400);
      }

      const profileUpdate: Record<string, unknown> = {};
      if (name !== undefined) profileUpdate.name = name;
      if (email !== undefined) profileUpdate.email = email;
      if (phone !== undefined) profileUpdate.phone = phone;
      if (Object.keys(profileUpdate).length > 0) {
        const { error: pErr } = await admin.from("profiles").update(profileUpdate).eq("id", user_id);
        if (pErr) return json({ error: pErr.message }, 400);
      }

      if (role) {
        await admin.from("user_roles").delete().eq("user_id", user_id);
        const { error: rErr } = await admin.from("user_roles").insert({ user_id, role });
        if (rErr) return json({ error: rErr.message }, 400);
      }

      return json({ ok: true });
    }

    if (body.action === "delete") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id obrigatório" }, 400);
      if (user_id === userData.user.id) return json({ error: "Não é possível excluir a si próprio." }, 400);

      const { error: delErr } = await admin.auth.admin.deleteUser(user_id);
      if (delErr) return json({ error: delErr.message }, 400);
      // profile/user_roles cascaded via FK or cleared:
      await admin.from("user_roles").delete().eq("user_id", user_id);
      await admin.from("profiles").delete().eq("id", user_id);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
