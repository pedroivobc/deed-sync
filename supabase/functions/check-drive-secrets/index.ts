const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SECRET_KEYS = [
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "GOOGLE_DRIVE_ROOT_FOLDER_ID",
  "GOOGLE_DRIVE_ESCRITURAS_FOLDER_ID",
  "GOOGLE_DRIVE_AVULSOS_FOLDER_ID",
  "GOOGLE_DRIVE_REGULARIZACAO_FOLDER_ID",
  "GOOGLE_DRIVE_CRM_FOLDER_ID",
] as const;

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const status: Record<string, boolean> = {};
  for (const k of SECRET_KEYS) status[k] = !!Deno.env.get(k);
  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
