import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { STAGE_CATEGORY_LABEL, type ServiceStageRow, type StageCategory } from "@/hooks/useServiceStages";

interface Props {
  stages: ServiceStageRow[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
}

const ORDER: StageCategory[] = ["active", "done", "closed"];

/**
 * Stage dropdown grouped by category (Active / Done / Closed).
 * Each option shows its color dot for quick recognition.
 */
export function DynamicStageSelect({ stages, value, onChange, placeholder = "Selecionar etapa" }: Props) {
  const grouped: Record<StageCategory, ServiceStageRow[]> = { active: [], done: [], closed: [] };
  for (const s of stages) grouped[s.category].push(s);

  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {ORDER.map((cat) =>
          grouped[cat].length === 0 ? null : (
            <SelectGroup key={cat}>
              <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {STAGE_CATEGORY_LABEL[cat]}
              </SelectLabel>
              {grouped[cat].map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ),
        )}
      </SelectContent>
    </Select>
  );
}