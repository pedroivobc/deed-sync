import { useServiceDocs } from "@/hooks/useServiceDocs";
import { computeDocProgress } from "@/lib/serviceDocs";
import type { EscrituraFields } from "@/lib/serviceFields";
import { PartiesSection } from "./PartiesSection";
import { CivilCertsSection } from "./CivilCertsSection";
import { InternetCertsSection } from "./InternetCertsSection";
import { PropertyDocsSection } from "./PropertyDocsSection";
import { DocChecklistPanel } from "./DocChecklistPanel";
import { ClickSignSection } from "../clicksign/ClickSignSection";
import { EmptyState } from "@/components/ui/empty-state";
import { Save } from "lucide-react";

interface Props {
  serviceId: string | null;
  imovel: EscrituraFields["imovel"];
  onImovelChange: (v: Partial<EscrituraFields["imovel"]>) => void;
}

/**
 * Renders the new detailed documentation system for Escritura services.
 * Requires the service to be saved first (needs serviceId for FK).
 */
export function EscrituraDocs({ serviceId, imovel, onImovelChange }: Props) {
  const { parties, civilCerts, internetCerts, itbi, registration, reload } = useServiceDocs(serviceId);
  const progress = computeDocProgress({ parties, civilCerts, internetCerts, itbi, registration });

  if (!serviceId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6">
        <EmptyState
          icon={Save}
          title="Salve o serviço primeiro"
          description="A nova estrutura de documentação requer que o serviço seja criado antes do cadastro de partes e certidões."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0 space-y-5">
        <PartiesSection serviceId={serviceId} parties={parties} onChanged={reload} />
        <CivilCertsSection serviceId={serviceId} parties={parties} civilCerts={civilCerts} onChanged={reload} />
        <InternetCertsSection serviceId={serviceId} parties={parties} internetCerts={internetCerts} onChanged={reload} />
        <PropertyDocsSection
          serviceId={serviceId}
          itbi={itbi}
          registration={registration}
          imovel={imovel}
          onImovelChange={onImovelChange}
          onChanged={reload}
        />
        <ClickSignSection
          serviceId={serviceId}
          parties={parties}
          imovel={imovel}
          onChanged={reload}
        />
      </div>
      <div className="lg:sticky lg:top-2 lg:h-fit">
        <DocChecklistPanel progress={progress} />
      </div>
    </div>
  );
}
