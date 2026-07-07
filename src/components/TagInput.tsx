import { useId, useState, type KeyboardEvent } from "react";

/** Campo de etiquetas en formato "chips": escribe y pulsa Enter/coma para añadir,
 * Backspace sobre el campo vacío quita la última. Mismo contenedor visual que
 * `inputClass` (Field.tsx), pero no puede reutilizarlo tal cual porque necesita
 * albergar los chips además del texto en edición.
 *
 * `htmlFor`/`id` explícitos en vez de envolver el input en un `<label>`: el botón
 * "×" de cada chip también es "labelable", así que en cuanto hay un chip antes del
 * input, el navegador asocia el `<label>` implícito a ESE botón (el primer elemento
 * labelable dentro), no al input — el campo se queda sin nombre accesible. Bug real
 * encontrado con el E2E: tras añadir la primera etiqueta, `getByLabel("Etiquetas")`
 * dejaba de encontrar el input. */
export function TagInput({
  tags,
  onChange,
  label,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  label: string;
}) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  function commitDraft() {
    const value = draft.trim();
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label htmlFor={inputId} className="font-medium text-[var(--text-secondary)]">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 transition-colors focus-within:border-[var(--accent-clay)]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
            style={{
              backgroundColor: "color-mix(in srgb, var(--accent-moss) 14%, var(--surface-1))",
              color: "var(--accent-moss)",
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Quitar etiqueta ${tag}`}
              className="transition-colors hover:text-[var(--status-critical)]"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={tags.length === 0 ? "comida, viajes…" : ""}
          className="min-w-24 flex-1 border-0 bg-transparent p-0 text-base text-[var(--text-primary)] outline-none sm:text-sm"
        />
      </div>
    </div>
  );
}
