import { useServiceDocs } from "@/hooks/useServiceDocs";
import { computeDocProgress, type DocProgress } from "@/lib/serviceDocs";
import type { EscrituraFields } from "@/lib/serviceFields";
import { PartiesSection } from "./PartiesSection";
import { CivilCertsSection } from "./CivilCertsSection";
import { InternetCertsSection } from "./InternetCertsSection";
import { PropertyDocsSection } from "./PropertyDocsSection";
import { ClickSignSection } from "../clicksign/ClickSignSection";
import { EmptyState } from "@/components/ui/empty-state";
import { Save } from "lucide-react";
import { useEffect } from "react";

interface Props {
  serviceId: string | null;
  imovel: EscrituraFields["imovel"];
  onImovelChange: (v: Partial<EscrituraFields["imovel"]>) => void;
  /** Optional callback so a parent layout can render the documentation
   *  checklist in its own (sticky) column instead of inline. */
  onDocProgressChange?: (progress: DocProgress | null) => void;
}

/**
 * Renders the new detailed documentation system for Escritura services.
 * Requires the service to be saved first (needs serviceId for FK).
 * The aggregated documentation progress is reported via `onDocProgressChange`,
 * letting the parent layout decide where to render the checklist panel.
 */
export function EscrituraDocs({ serviceId, imovel, onImovelChange, onDocProgressChange }: Props) {
  const { parties, civilCerts, internetCerts, itbi, registration, reload } = useServiceDocs(serviceId);
  const progress = computeDocProgress({ parties, civilCerts, internetCerts, itbi, registration });

  // Keep parent in sync with the latest progress so the checklist can be
  // rendered in the outer right column.
  useEffect(() => {
    onDocProgressChange?.(serviceId ? progress : null);
    // Cleanup: when this component unmounts, clear progress for the parent.
    return () => onDocProgressChange?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, progress.overallPercent, progress.partiesCount, progress.internet.issuedCount, progress.itbi.isIssued, progress.registration.hasRecord]);

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
    <div className="space-y-5">
      <PartiesSection serviceId={serviceId} parties={parties} onChanged={reload} />
      <CivilCertsSection serviceId={serviceId} parties={parties} civilCerts={civilCerts} onChanged={reload} />
      <InternetCertsSection serviceId={serviceId} parties={parties} internetCerts={internetCerts} onChanged={reload} />
      <PropertyDocsSection
        serviceId={serviceId}
        itbi={itbi}
        registration={registration}
        onChanged={reload}
      />
      <ClickSignSection
        serviceId={serviceId}
        parties={parties}
        imovel={imovel}
        onChanged={reload}
      />
    </div>
  );
}
