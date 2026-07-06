import { forwardRef, type ButtonHTMLAttributes } from "react";
import { focusRing } from "./Field";

/**
 * Solo tres tonos de marca, deliberadamente pocos: "ink" es la acción principal por
 * defecto de cualquier pantalla o formulario; "indigo" se reserva para la acción que
 * dispara una respuesta generada por IA (Chat); "critical" para confirmar un borrado.
 */
export type ButtonTone = "ink" | "indigo" | "critical";

/**
 * "solid": botón principal, píldora rellena.
 * "tint": píldora con fondo muy suave del color del tono y texto/borde en ese color,
 * para acciones secundarias que se benefician de distinguirse por color sin competir
 * en peso visual con el botón sólido principal.
 * "ghost": botón terciario, sin fondo ni color de marca (p. ej. "Cancelar").
 */
export type ButtonVariant = "solid" | "tint" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  variant?: ButtonVariant;
  /** Reduce el padding para usos compactos (p. ej. junto a un título). */
  size?: "sm" | "md";
}

const toneVars: Record<ButtonTone, { bg: string; fg: string }> = {
  ink: { bg: "var(--ink)", fg: "var(--on-ink)" },
  indigo: { bg: "var(--accent-indigo)", fg: "var(--on-accent-indigo)" },
  critical: { bg: "var(--status-critical)", fg: "var(--on-status-critical)" },
};

/**
 * Botón compartido por toda la app: misma forma de píldora, radios y transiciones en
 * cualquier pantalla o formulario. No lleva lógica de negocio, solo presentación.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { tone = "ink", variant = "solid", size = "md", className = "", style, disabled, children, type = "button", ...rest },
  ref,
) {
  const sizeClass = size === "sm" ? "px-3.5 py-1.5 text-sm" : "px-4 py-2.5 text-sm";
  const base = `inline-flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

  if (variant === "ghost") {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={`${base} ${sizeClass} text-[var(--text-secondary)] hover:bg-[var(--gridline)] active:scale-[0.98] ${className}`}
        style={style}
        {...rest}
      >
        {children}
      </button>
    );
  }

  const colors = toneVars[tone];

  if (variant === "tint") {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={`${base} ${sizeClass} border hover:brightness-95 active:scale-[0.98] ${className}`}
        style={{
          backgroundColor: `color-mix(in srgb, ${colors.bg} 14%, var(--surface-1))`,
          borderColor: `color-mix(in srgb, ${colors.bg} 30%, transparent)`,
          color: colors.bg,
          ...style,
        }}
        {...rest}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={`${base} ${sizeClass} shadow-card hover:shadow-card-hover hover:brightness-110 active:scale-[0.98] ${className}`}
      style={{ backgroundColor: colors.bg, color: colors.fg, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
});
