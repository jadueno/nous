function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg bg-[var(--gridline)] ${className}`} />;
}

/** Skeleton de carga para listas de tarjetas (Notas), mientras llega la
 * respuesta del backend. */
export function ListSkeleton({
  count = 3,
  columns = 2,
  label = "Cargando…",
}: {
  count?: number;
  columns?: 1 | 2;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={columns === 2 ? "grid gap-4 sm:grid-cols-2" : "flex flex-col gap-4"}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="flex flex-col gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-card sm:p-6"
        >
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-3 w-1/3" />
          <SkeletonBlock className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}
