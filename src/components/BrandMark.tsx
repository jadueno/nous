/**
 * Marca de la app: los dos únicos acentos "vivos" de Nous (índigo + teal) superpuestos
 * sobre un fondo tinta — mismo lenguaje visual que el resto de la identidad, condensado
 * en el logo.
 */
export function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dims = size === "sm" ? "size-8" : "size-9";
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex ${dims} shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--ink)]`}
    >
      <span className="absolute -top-2 -left-2 size-6 rounded-full bg-[var(--accent-indigo)]" />
      <span className="absolute -right-2 -bottom-2 size-6 rounded-full bg-[var(--accent-teal)]" />
    </span>
  );
}
