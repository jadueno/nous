/**
 * Marca de la app: dos gotas de tinta (arcilla + musgo, los únicos acentos "vivos" de
 * Nous) sobre una insignia de esquinas redondeadas tinta — deliberadamente distinta de
 * la marca de Rumbo (círculo con dos círculos superpuestos): forma cuadrada tipo sello
 * en vez de circular, gotas en vez de círculos planos.
 */
export function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dims = size === "sm" ? "size-8" : "size-9";
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex ${dims} shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--ink)]`}
    >
      <span className="absolute -top-2 -left-2 size-6 rotate-45 rounded-[45%_45%_45%_0%] bg-[var(--accent-clay)]" />
      <span className="absolute -right-2 -bottom-2 size-6 rotate-[225deg] rounded-[45%_45%_45%_0%] bg-[var(--accent-moss)]" />
    </span>
  );
}
