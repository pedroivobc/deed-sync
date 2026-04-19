import { useQuery } from "@tanstack/react-query";
import { getEntityRootFolder, type DriveFolderRow } from "@/lib/drive";

export function useDriveFolder(
  entityType: "service" | "client" | null,
  entityId: string | null,
) {
  return useQuery<DriveFolderRow | null>({
    queryKey: ["drive_folder", entityType, entityId],
    queryFn: () => (entityType && entityId ? getEntityRootFolder(entityType, entityId) : Promise.resolve(null)),
    enabled: Boolean(entityType && entityId),
    staleTime: 1000 * 60 * 10, // 10 min
  });
}
