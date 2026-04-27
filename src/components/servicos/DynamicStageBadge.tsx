import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  color?: string | null;
  className?: string;
}

/**
 * Renders a stage badge using a hex color stored in the database.
 * The chip uses a translucent background and a colored dot so it works
 * across light/dark themes without needing tokens for every shade.
 */
export function DynamicStageBadge({ name, color, className }: Props) {
  const c = color || "#64748b";
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1.5 border", className)}
      style={{
        backgroundColor: `${c}1f`, // ~12% alpha
        color: c,
        borderColor: `${c}40`,
      }}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: c }}
      />
      {name}
    </Badge>
  );
}