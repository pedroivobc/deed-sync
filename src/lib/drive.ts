import { supabase } from "@/integrations/supabase/client";

export interface DriveActionResult<T = unknown> {
  ok: boolean;
  result?: T;
  error?: string;
}

export async function callDrive<T = unknown>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<DriveActionResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke("google-drive-manager", {
      body: { action, params },
    });
    if (error) return { ok: false, error: error.message };
    if (data && typeof data === "object" && "ok" in data) {
      return data as DriveActionResult<T>;
    }
    if (data && typeof data === "object" && "success" in data) {
      const d = data as { success: boolean; error?: string; [k: string]: unknown };
      return { ok: !!d.success, result: d as unknown as T, error: d.error };
    }
    return { ok: true, result: data as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function checkDriveSecrets(): Promise<Record<string, boolean>> {
  try {
    const { data, error } = await supabase.functions.invoke("check-drive-secrets", {
      body: {},
    });
    if (error || !data) return {};
    return data as Record<string, boolean>;
  } catch {
    return {};
  }
}

export interface DriveFolderRow {
  id: string;
  entity_type: "service" | "client";
  entity_id: string;
  drive_folder_id: string;
  drive_folder_url: string;
  folder_path: string;
  subfolder_type: string;
}

export async function getEntityRootFolder(
  entityType: "service" | "client",
  entityId: string,
): Promise<DriveFolderRow | null> {
  const { data } = await supabase
    .from("drive_folders")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("subfolder_type", "root")
    .maybeSingle();
  return (data as DriveFolderRow | null) ?? null;
}
