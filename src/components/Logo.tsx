interface Props {
  collapsed?: boolean;
}

export function Logo({ collapsed }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display text-xl font-bold shadow-soft">
        C
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="font-display text-lg font-semibold">Clemente</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Assessoria
          </span>
        </div>
      )}
    </div>
  );
}
