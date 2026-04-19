import { useState } from "react";
import { FolderOpen, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callDrive } from "@/lib/drive";
import { useDriveFolder } from "@/hooks/useDriveFolder";
import { useQueryClient } from "@tanstack/react-query";

interface BaseProps {
  entityType: "service" | "client";
  entityId: string | null;
}

interface ServiceProps extends BaseProps {
  entityType: "service";
  serviceType: "escritura" | "avulso" | "regularizacao";
  clientName: string | null;
  subject?: string | null;
  matricula?: string | null;
}

interface ClientProps extends BaseProps {
  entityType: "client";
  clientName: string | null;
  cpfCnpj?: string | null;
}

type Props = ServiceProps | ClientProps;

export function DriveFolderButton(props: Props) {
  const { entityType, entityId } = props;
  const { data: folder, isLoading } = useDriveFolder(entityType, entityId);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();

  if (!entityId) return null;

  const handleCreate = async () => {
    if (!entityId) return;
    setCreating(true);
    const action = entityType === "service" ? "create_service_folder" : "create_client_folder";
    const params: Record<string, unknown> =
      entityType === "service"
        ? {
            service_id: entityId,
            type: (props as ServiceProps).serviceType,
            client_name: (props as ServiceProps).clientName ?? "Cliente",
            subject: (props as ServiceProps).subject ?? undefined,
            matricula: (props as ServiceProps).matricula ?? undefined,
          }
        : {
            client_id: entityId,
            client_name: (props as ClientProps).clientName ?? "Cliente",
            cpf_cnpj: (props as ClientProps).cpfCnpj ?? undefined,
          };

    const res = await callDrive(action, params);
    setCreating(false);
    if (!res.ok) {
      toast.error(`Falha ao criar pasta: ${res.error ?? "erro desconhecido"}`);
      return;
    }
    toast.success("Pasta criada no Google Drive.");
    qc.invalidateQueries({ queryKey: ["drive_folder", entityType, entityId] });
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Drive
      </Button>
    );
  }

  if (folder) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => window.open(folder.drive_folder_url, "_blank", "noopener")}
      >
        <FolderOpen className="h-4 w-4" /> Abrir pasta no Drive
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 border-warning/50 text-warning hover:bg-warning/10"
      onClick={handleCreate}
      disabled={creating}
    >
      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
      {creating ? "Criando..." : "Criar pasta no Drive"}
    </Button>
  );
}
