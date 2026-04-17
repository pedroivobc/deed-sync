import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  items: Crumb[];
}

/**
 * Discrete breadcrumb shown under the page title.
 * The last crumb is always rendered as the current page (non-clickable).
 */
export function Breadcrumbs({ items }: Props) {
  if (!items?.length) return null;
  return (
    <nav aria-label="breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
              {last || !c.to ? (
                <span className="text-foreground">{c.label}</span>
              ) : (
                <Link
                  to={c.to}
                  className="rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
