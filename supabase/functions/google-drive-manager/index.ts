// Edge Function: google-drive-manager
// Manages Google Drive folder structure for services and clients via a Service Account.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
const ROOT_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID");
const ESCRITURAS_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_ESCRITURAS_FOLDER_ID");
const AVULSOS_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_AVULSOS_FOLDER_ID");
const REGULARIZACAO_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_REGULARIZACAO_FOLDER_ID");
const CRM_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_CRM_FOLDER_ID");

// ───────────────────────────────────────────────────────────────────────────────
// JWT signing for Google Service Account auth
// ───────────────────────────────────────────────────────────────────────────────

function base64UrlEncode(bytes: Uint8Array): string {
  let str = btoa(String.fromCharCode(...bytes));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToBase64Url(s: string): string {
  return base64UrlEncode(new TextEncoder().encode(s));
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  if (!SERVICE_ACCOUNT_JSON) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
  }
  const sa = JSON.parse(SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${strToBase64Url(JSON.stringify(header))}.${strToBase64Url(JSON.stringify(claims))}`;
  const key = await importPrivateKey(sa.private_key);
  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64UrlEncode(new Uint8Array(sigBuf))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  cachedToken = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.token;
}

// ───────────────────────────────────────────────────────────────────────────────
// Drive helpers
// ───────────────────────────────────────────────────────────────────────────────

async function driveFetch(path: string, init: RequestInit = {}, retries = 3): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");

  let attempt = 0;
  let delay = 500;
  while (true) {
    const res = await fetch(`https://www.googleapis.com/drive/v3${path}`, { ...init, headers });
    if (res.ok || res.status === 404 || res.status < 500) return res;
    if (attempt >= retries) return res;
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
    attempt++;
  }
}

async function createDriveFolder(name: string, parentId: string): Promise<{ id: string; webViewLink: string }> {
  const res = await driveFetch("/files?supportsAllDrives=true&fields=id,webViewLink", {
    method: "POST",
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  if (!res.ok) throw new Error(`createDriveFolder failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function sanitize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .slice(0, 100) || "Sem-Nome";
}

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// ───────────────────────────────────────────────────────────────────────────────
// Action handlers
// ───────────────────────────────────────────────────────────────────────────────

interface Ctx {
  supabase: ReturnType<typeof createClient>;
  userId: string | null;
}

async function logSync(
  ctx: Ctx,
  operation: string,
  status: "success" | "failed" | "partial",
  data: {
    entity_type?: string;
    entity_id?: string;
    drive_resource_id?: string;
    details?: Record<string, unknown>;
    error_message?: string;
  } = {},
) {
  await ctx.supabase.from("drive_sync_logs").insert({
    operation,
    status,
    user_id: ctx.userId,
    ...data,
  });
}

async function actionTestConnection(ctx: Ctx) {
  if (!ROOT_FOLDER_ID) throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID not configured");
  const res = await driveFetch(
    `/files?q=${encodeURIComponent(`'${ROOT_FOLDER_ID}' in parents and trashed=false`)}&pageSize=5&fields=files(id,name,mimeType)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  );
  if (!res.ok) {
    const text = await res.text();
    await logSync(ctx, "test_connection", "failed", { error_message: `${res.status} ${text}` });
    throw new Error(`Drive test failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const sa = SERVICE_ACCOUNT_JSON ? JSON.parse(SERVICE_ACCOUNT_JSON) : null;
  await logSync(ctx, "test_connection", "success", {
    details: { item_count: data.files?.length ?? 0 },
  });
  return {
    connected: true,
    service_account_email: sa?.client_email ?? null,
    sample_items: data.files ?? [],
    root_folder_id: ROOT_FOLDER_ID,
  };
}

function getRootForServiceType(type: string): string | undefined {
  switch (type) {
    case "escritura":
      return ESCRITURAS_FOLDER_ID;
    case "avulso":
      return AVULSOS_FOLDER_ID;
    case "regularizacao":
      return REGULARIZACAO_FOLDER_ID;
  }
}

const ESCRITURA_SUBFOLDERS: Array<{ name: string; type: string }> = [
  { name: "1. Certidões Pessoais", type: "certidoes_pessoais" },
  { name: "2. Certidões Internet", type: "certidoes_internet" },
  { name: "3. Documentos Imóvel", type: "docs_imovel" },
  { name: "4. Contrato", type: "contrato" },
  { name: "5. Escritura Final", type: "escritura_final" },
];

const SIMPLE_SUBFOLDERS: Array<{ name: string; type: string }> = [
  { name: "1. Documentos Recebidos", type: "docs_recebidos" },
  { name: "2. Documentos Gerados", type: "docs_gerados" },
  { name: "3. Entrega Final", type: "entrega_final" },
];

const CLIENT_SUBFOLDERS: Array<{ name: string; type: string }> = [
  { name: "Documentos Pessoais", type: "docs_pessoais" },
  { name: "Histórico de Serviços", type: "historico_servicos" },
  { name: "Comunicações", type: "comunicacoes" },
];

async function actionCreateServiceFolder(
  ctx: Ctx,
  params: { service_id: string; type: string; client_name: string; subject?: string; matricula?: string },
) {
  const { service_id, type, client_name } = params;

  // Idempotency: if root already exists, return it
  const { data: existing } = await ctx.supabase
    .from("drive_folders")
    .select("*")
    .eq("entity_type", "service")
    .eq("entity_id", service_id)
    .eq("subfolder_type", "root")
    .maybeSingle();
  if (existing) {
    return { already_exists: true, folder: existing };
  }

  const rootForType = getRootForServiceType(type);
  if (!rootForType) throw new Error(`No root folder configured for service type: ${type}`);

  const year = String(new Date().getFullYear());
  // Find or create year folder
  const yearQuery = `'${rootForType}' in parents and name='${year}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const yearRes = await driveFetch(
    `/files?q=${encodeURIComponent(yearQuery)}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  );
  const yearJson = await yearRes.json();
  let yearFolderId: string;
  if (yearJson.files && yearJson.files.length > 0) {
    yearFolderId = yearJson.files[0].id;
  } else {
    const created = await createDriveFolder(year, rootForType);
    yearFolderId = created.id;
  }

  // Build folder name
  let folderName: string;
  if (type === "escritura") {
    const tail = params.matricula
      ? `Mat. ${sanitize(params.matricula)}`
      : sanitize(params.subject || shortId(service_id));
    folderName = `${sanitize(client_name)} - ${tail}`;
  } else {
    const month = MONTHS_PT[new Date().getMonth()];
    folderName = `${sanitize(client_name)} - ${month}`;
  }

  // Create main folder
  const mainFolder = await createDriveFolder(folderName, yearFolderId);
  const folderPath = `${type === "escritura" ? "01 - Escrituras" : type === "avulso" ? "02 - Serviços Avulsos" : "03 - Regularização de Imóveis"}/${year}/${folderName}`;

  // Insert root row
  const rootRow = {
    entity_type: "service",
    entity_id: service_id,
    drive_folder_id: mainFolder.id,
    drive_folder_url: mainFolder.webViewLink,
    folder_path: folderPath,
    parent_folder_id: yearFolderId,
    subfolder_type: "root",
  };
  await ctx.supabase.from("drive_folders").insert(rootRow);

  // Create subfolders
  const subfolders = type === "escritura" ? ESCRITURA_SUBFOLDERS : SIMPLE_SUBFOLDERS;
  const subRows: Array<Record<string, unknown>> = [];
  for (const sf of subfolders) {
    try {
      const created = await createDriveFolder(sf.name, mainFolder.id);
      subRows.push({
        entity_type: "service",
        entity_id: service_id,
        drive_folder_id: created.id,
        drive_folder_url: created.webViewLink,
        folder_path: `${folderPath}/${sf.name}`,
        parent_folder_id: mainFolder.id,
        subfolder_type: sf.type,
      });
    } catch (e) {
      console.error(`Subfolder ${sf.name} failed:`, e);
    }
  }
  if (subRows.length > 0) {
    await ctx.supabase.from("drive_folders").insert(subRows);
  }

  await logSync(ctx, "folder_created", "success", {
    entity_type: "service",
    entity_id: service_id,
    drive_resource_id: mainFolder.id,
    details: { folder_path: folderPath, subfolders: subRows.length },
  });

  return {
    main_folder_id: mainFolder.id,
    main_folder_url: mainFolder.webViewLink,
    folder_path: folderPath,
    subfolders: subRows.length,
  };
}

async function actionCreateClientFolder(
  ctx: Ctx,
  params: { client_id: string; client_name: string; cpf_cnpj?: string },
) {
  const { client_id, client_name, cpf_cnpj } = params;

  const { data: existing } = await ctx.supabase
    .from("drive_folders")
    .select("*")
    .eq("entity_type", "client")
    .eq("entity_id", client_id)
    .eq("subfolder_type", "root")
    .maybeSingle();
  if (existing) return { already_exists: true, folder: existing };

  if (!CRM_FOLDER_ID) throw new Error("GOOGLE_DRIVE_CRM_FOLDER_ID not configured");

  const folderName = cpf_cnpj
    ? `${sanitize(client_name)} - ${sanitize(cpf_cnpj)}`
    : sanitize(client_name);

  const mainFolder = await createDriveFolder(folderName, CRM_FOLDER_ID);
  const folderPath = `04 - CRM - Clientes/${folderName}`;

  await ctx.supabase.from("drive_folders").insert({
    entity_type: "client",
    entity_id: client_id,
    drive_folder_id: mainFolder.id,
    drive_folder_url: mainFolder.webViewLink,
    folder_path: folderPath,
    parent_folder_id: CRM_FOLDER_ID,
    subfolder_type: "root",
  });

  const subRows: Array<Record<string, unknown>> = [];
  for (const sf of CLIENT_SUBFOLDERS) {
    try {
      const created = await createDriveFolder(sf.name, mainFolder.id);
      subRows.push({
        entity_type: "client",
        entity_id: client_id,
        drive_folder_id: created.id,
        drive_folder_url: created.webViewLink,
        folder_path: `${folderPath}/${sf.name}`,
        parent_folder_id: mainFolder.id,
        subfolder_type: sf.type,
      });
    } catch (e) {
      console.error(`Client subfolder ${sf.name} failed:`, e);
    }
  }
  if (subRows.length > 0) await ctx.supabase.from("drive_folders").insert(subRows);

  await logSync(ctx, "folder_created", "success", {
    entity_type: "client",
    entity_id: client_id,
    drive_resource_id: mainFolder.id,
    details: { folder_path: folderPath, subfolders: subRows.length },
  });

  return {
    main_folder_id: mainFolder.id,
    main_folder_url: mainFolder.webViewLink,
    folder_path: folderPath,
    subfolders: subRows.length,
  };
}

async function actionListFolderContents(_ctx: Ctx, params: { folder_id: string }) {
  const res = await driveFetch(
    `/files?q=${encodeURIComponent(`'${params.folder_id}' in parents and trashed=false`)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  );
  if (!res.ok) throw new Error(`list failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * List ALL files (recursively) under a given service or client root folder.
 * Includes the subfolder name each file belongs to so the UI can group them.
 */
async function actionListEntityFiles(
  ctx: Ctx,
  params: { entity_type: "service" | "client"; entity_id: string },
) {
  // Fetch every drive_folders row for this entity (root + subfolders).
  const { data: folders, error } = await ctx.supabase
    .from("drive_folders")
    .select("drive_folder_id, subfolder_type, folder_path")
    .eq("entity_type", params.entity_type)
    .eq("entity_id", params.entity_id);

  if (error) throw new Error(`folders lookup failed: ${error.message}`);
  if (!folders || folders.length === 0) {
    return { files: [], folders: [], folder_url: null };
  }

  type Row = { drive_folder_id: string; subfolder_type: string; folder_path: string };
  const folderRows = folders as unknown as Row[];
  const rootRow = folderRows.find((f) => f.subfolder_type === "root") ?? null;

  const all: Array<Record<string, unknown>> = [];
  for (const f of folderRows) {
    try {
      const r = await driveFetch(
        `/files?q=${encodeURIComponent(
          `'${f.drive_folder_id}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`,
        )}&fields=files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink)&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      );
      if (!r.ok) continue;
      const j = await r.json();
      for (const file of j.files ?? []) {
        all.push({
          ...file,
          subfolder_type: f.subfolder_type,
          folder_path: f.folder_path,
        });
      }
    } catch (e) {
      console.error("listEntityFiles partial fail", e);
    }
  }

  // Sort by modifiedTime DESC
  all.sort((a, b) => {
    const am = String(a.modifiedTime ?? "");
    const bm = String(b.modifiedTime ?? "");
    return bm.localeCompare(am);
  });

  return {
    files: all,
    folders: folderRows,
    folder_url: rootRow ? `https://drive.google.com/drive/folders/${rootRow.drive_folder_id}` : null,
    root_folder_id: rootRow?.drive_folder_id ?? null,
  };
}

async function actionGetFileMetadata(_ctx: Ctx, params: { file_id: string }) {
  const res = await driveFetch(
    `/files/${params.file_id}?fields=id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink,parents&supportsAllDrives=true`,
  );
  if (!res.ok) throw new Error(`metadata failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Upload file (base64) to a specific subfolder of a service or client
async function actionUploadFile(
  ctx: Ctx,
  params: {
    entity_type: "service" | "client";
    entity_id: string;
    subfolder_type: string;
    file_base64: string;
    file_name: string;
    mime_type: string;
    file_size?: number;
    related_entity_type?: string;
    related_entity_id?: string;
  },
) {
  // Find target folder for the requested subfolder_type
  const { data: folder, error: folderErr } = await ctx.supabase
    .from("drive_folders")
    .select("drive_folder_id, folder_path")
    .eq("entity_type", params.entity_type)
    .eq("entity_id", params.entity_id)
    .eq("subfolder_type", params.subfolder_type)
    .maybeSingle();

  if (folderErr) throw new Error(`folder lookup failed: ${folderErr.message}`);
  if (!folder) {
    throw new Error(
      `Subfolder '${params.subfolder_type}' not found for ${params.entity_type} ${params.entity_id}. Create the folder structure first.`,
    );
  }

  // Decode base64
  const bin = Uint8Array.from(atob(params.file_base64), (c) => c.charCodeAt(0));

  // Multipart upload to Drive
  const boundary = `----boundary${crypto.randomUUID()}`;
  const metadata = {
    name: params.file_name,
    parents: [folder.drive_folder_id as string],
  };

  const enc = new TextEncoder();
  const part1 = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${params.mime_type}\r\n\r\n`,
  );
  const part3 = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(part1.length + bin.length + part3.length);
  body.set(part1, 0);
  body.set(bin, part1.length);
  body.set(part3, part1.length + bin.length);

  const token = await getAccessToken();
  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,size,mimeType,webViewLink,webContentLink,thumbnailLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    await logSync(ctx, "file_uploaded", "failed", {
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      error_message: `${uploadRes.status} ${text}`,
    });
    throw new Error(`Drive upload failed: ${uploadRes.status} ${text}`);
  }
  const uploaded = await uploadRes.json();

  // Persist drive_files row
  const { data: inserted, error: insertErr } = await ctx.supabase
    .from("drive_files")
    .insert({
      drive_file_id: uploaded.id,
      drive_folder_id: folder.drive_folder_id,
      file_name: uploaded.name ?? params.file_name,
      file_size: Number(uploaded.size ?? params.file_size ?? bin.length),
      mime_type: uploaded.mimeType ?? params.mime_type,
      preview_url: uploaded.webViewLink ?? null,
      download_url: uploaded.webContentLink ?? null,
      thumbnail_url: uploaded.thumbnailLink ?? null,
      service_id: params.entity_type === "service" ? params.entity_id : null,
      client_id: params.entity_type === "client" ? params.entity_id : null,
      related_entity_type: params.related_entity_type ?? null,
      related_entity_id: params.related_entity_id ?? null,
      uploaded_by: ctx.userId,
    })
    .select()
    .single();

  if (insertErr) {
    console.error("drive_files insert error:", insertErr);
  }

  await logSync(ctx, "file_uploaded", "success", {
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    drive_resource_id: uploaded.id,
    details: { folder_path: folder.folder_path, file_name: params.file_name, size: bin.length },
  });

  return {
    drive_file_id: uploaded.id,
    drive_folder_id: folder.drive_folder_id,
    web_view_link: uploaded.webViewLink,
    download_url: uploaded.webContentLink,
    thumbnail_url: uploaded.thumbnailLink,
    file_name: uploaded.name,
    file_size: Number(uploaded.size ?? bin.length),
    mime_type: uploaded.mimeType ?? params.mime_type,
    db_row_id: inserted?.id ?? null,
  };
}

// Delete a file from Drive (and optionally its drive_files row)
async function actionDeleteFile(
  ctx: Ctx,
  params: { drive_file_id: string },
) {
  const res = await driveFetch(`/files/${params.drive_file_id}?supportsAllDrives=true`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    await logSync(ctx, "file_deleted", "failed", {
      drive_resource_id: params.drive_file_id,
      error_message: `${res.status} ${text}`,
    });
    throw new Error(`Drive delete failed: ${res.status} ${text}`);
  }

  await ctx.supabase.from("drive_files").delete().eq("drive_file_id", params.drive_file_id);

  await logSync(ctx, "file_deleted", "success", {
    drive_resource_id: params.drive_file_id,
  });
  return { deleted: true };
}

// Download file content as base64 (used for inline preview when public link not viable)
async function actionDownloadFile(_ctx: Ctx, params: { drive_file_id: string }) {
  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${params.drive_file_id}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`download failed: ${res.status} ${await res.text()}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  // Convert to base64 in chunks to avoid stack overflow
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);

  const meta = await driveFetch(
    `/files/${params.drive_file_id}?fields=name,mimeType,size&supportsAllDrives=true`,
  );
  const metaJson = meta.ok ? await meta.json() : {};

  return {
    base64,
    file_name: metaJson.name ?? "file",
    mime_type: metaJson.mimeType ?? "application/octet-stream",
    file_size: Number(metaJson.size ?? buf.length),
  };
}

async function actionSecretsStatus(_ctx: Ctx) {
  return {
    GOOGLE_SERVICE_ACCOUNT_JSON: Boolean(SERVICE_ACCOUNT_JSON),
    GOOGLE_DRIVE_ROOT_FOLDER_ID: Boolean(ROOT_FOLDER_ID),
    GOOGLE_DRIVE_ESCRITURAS_FOLDER_ID: Boolean(ESCRITURAS_FOLDER_ID),
    GOOGLE_DRIVE_AVULSOS_FOLDER_ID: Boolean(AVULSOS_FOLDER_ID),
    GOOGLE_DRIVE_REGULARIZACAO_FOLDER_ID: Boolean(REGULARIZACAO_FOLDER_ID),
    GOOGLE_DRIVE_CRM_FOLDER_ID: Boolean(CRM_FOLDER_ID),
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// HTTP entrypoint
// ───────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const body = await req.json();
    const { action, params = {} } = body as { action: string; params?: Record<string, unknown> };
    const ctx: Ctx = { supabase, userId };

    let result: unknown;
    switch (action) {
      case "secrets_status":
        result = await actionSecretsStatus(ctx);
        break;
      case "test_connection":
        result = await actionTestConnection(ctx);
        break;
      case "create_service_folder":
        result = await actionCreateServiceFolder(ctx, params as never);
        break;
      case "create_client_folder":
        result = await actionCreateClientFolder(ctx, params as never);
        break;
      case "list_folder_contents":
        result = await actionListFolderContents(ctx, params as never);
        break;
      case "list_entity_files":
        result = await actionListEntityFiles(ctx, params as never);
        break;
      case "get_file_metadata":
        result = await actionGetFileMetadata(ctx, params as never);
        break;
      case "upload_file":
        result = await actionUploadFile(ctx, params as never);
        break;
      case "delete_file":
        result = await actionDeleteFile(ctx, params as never);
        break;
      case "download_file":
        result = await actionDownloadFile(ctx, params as never);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("google-drive-manager error:", message);
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from("drive_sync_logs").insert({
        operation: "error",
        status: "failed",
        error_message: message,
      });
    } catch (_) { /* swallow */ }
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
