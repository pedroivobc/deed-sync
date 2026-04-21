import { useState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useClientsForPicker, useServicesForPicker } from "@/hooks/calculo-na-mao/useUltimoValorVenal";

interface Props {
  clientId: string | null;
  serviceId: string | null;
  onChange: (link: { clientId: string | null; serviceId: string | null }) => void;
  disabled?: boolean;
}

export function LinkServiceDialog({ clientId, serviceId, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [draftClient, setDraftClient] = useState<string | null>(clientId);
  const [draftService, setDraftService] = useState<string | null>(serviceId);
  const { data: clients = [] } = useClientsForPicker();
  const { data: services = [] } = useServicesForPicker();

  const filtered = draftClient
    ? services.filter((s: any) => s.client_id === draftClient)
    : services;

  const linked = !!(clientId || serviceId);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setDraftClient(clientId);
          setDraftService(serviceId);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={linked ? "default" : "outline"} size="sm" disabled={disabled}>
          <Link2 className="mr-2 h-4 w-4" />
          {linked ? "Vínculo configurado" : "Vincular a cliente/serviço"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular cálculo</DialogTitle>
          <DialogDescription>
            Associe este cálculo a um cliente do CRM e/ou a um serviço em andamento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Cliente</Label>
            <Select value={draftClient ?? "__none__"} onValueChange={(v) => {
              setDraftClient(v === "__none__" ? null : v);
              setDraftService(null);
            }}>
              <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem vínculo</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Serviço {draftClient ? "(filtrado pelo cliente)" : ""}</Label>
            <Select value={draftService ?? "__none__"} onValueChange={(v) => setDraftService(v === "__none__" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar serviço" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem vínculo</SelectItem>
                {filtered.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.subject} {s.clients?.name ? `— ${s.clients.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => {
            onChange({ clientId: draftClient, serviceId: draftService });
            setOpen(false);
          }}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}