import type { ReactNode } from "react";

/** Anillo de foco consistente para toda la app: mismo acento (índigo) que el resto de
 * elementos interactivos de marca, para no introducir un tercer color "vivo". */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-indigo)]";

/** Estilo compartido para inputs, textareas y selects de los formularios.
 * `text-base` (16px) en móvil a propósito: por debajo de 16px, Safari/iOS hace zoom
 * automático de toda la página al enfocar el campo (se ve como si "creciera" y
 * apareciera scroll horizontal) — `sm:text-sm` recupera el tamaño más compacto en
 * escritorio, donde ese zoom automático no existe. */
export const inputClass = `w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-base sm:text-sm text-[var(--text-primary)] transition-colors focus-visible:border-[var(--accent-indigo)] ${focusRing}`;

/**
 * Envuelve el control en un <label>, así el texto de la etiqueta y el campo quedan
 * asociados de forma nativa (funciona con `getByLabelText` en tests y con lectores
 * de pantalla sin necesitar `htmlFor`/`id` a mano).
 */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--text-secondary)]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[var(--text-muted)]">{hint}</span>}
    </label>
  );
}
