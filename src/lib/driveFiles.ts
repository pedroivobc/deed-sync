import { callDrive } from "./drive";

export interface UploadedDriveFile {
  drive_file_id: string;
  drive_folder_id: string;
  web_view_link: string | null;
  download_url: string | null;
  thumbnail_url: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  db_row_id: string | null;
}

export interface DownloadedFile {
  base64: string;
  file_name: string;
  mime_type: string;
  file_size: number;
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadFileToDrive(input: {
  file: File;
  entityType: "service" | "client";
  entityId: string;
  subfolderType: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}): Promise<UploadedDriveFile> {
  const base64 = await fileToBase64(input.file);
  const res = await callDrive<UploadedDriveFile>("upload_file", {
    entity_type: input.entityType,
    entity_id: input.entityId,
    subfolder_type: input.subfolderType,
    file_base64: base64,
    file_name: input.file.name,
    mime_type: input.file.type || "application/octet-stream",
    file_size: input.file.size,
    related_entity_type: input.relatedEntityType ?? null,
    related_entity_id: input.relatedEntityId ?? null,
  });
  if (!res.ok || !res.result) {
    throw new Error(res.error ?? "Falha no upload");
  }
  return res.result;
}

export async function deleteDriveFile(driveFileId: string): Promise<void> {
  const res = await callDrive("delete_file", { drive_file_id: driveFileId });
  if (!res.ok) throw new Error(res.error ?? "Falha ao remover arquivo");
}

export async function downloadDriveFile(driveFileId: string): Promise<DownloadedFile> {
  const res = await callDrive<DownloadedFile>("download_file", {
    drive_file_id: driveFileId,
  });
  if (!res.ok || !res.result) throw new Error(res.error ?? "Falha ao baixar");
  return res.result;
}

/** Builds a Drive web view URL for opening in a new tab. */
export function driveWebViewUrl(driveFileId: string): string {
  return `https://drive.google.com/file/d/${driveFileId}/view`;
}

export const ACCEPTED_FILE_TYPES = "application/pdf,image/jpeg,image/png,image/jpg";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function validateFile(f: File): string | null {
  const ok = ACCEPTED_FILE_TYPES.split(",").includes(f.type);
  if (!ok) return "Apenas PDF, JPG e PNG são aceitos.";
  if (f.size > MAX_FILE_BYTES) return "O arquivo excede o limite de 10MB.";
  return null;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
