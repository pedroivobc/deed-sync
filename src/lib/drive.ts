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
    return data as DriveActionResult<T>;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
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
