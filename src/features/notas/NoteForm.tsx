import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Field, inputClass } from "../../components/Field";
import type { NewNote, Note } from "../../data/types";

/** Formulario de crear/editar nota: mismo componente para ambos casos, distinguidos por
 * si se recibe `initialNote`. Un solo campo de contenido — el título se deriva solo de
 * la primera línea, así que no hay nada más que rellenar para una nota rápida. */
export function NoteForm({
  initialNote,
  onSubmit,
  onCancel,
}: {
  initialNote?: Note;
  onSubmit: (note: NewNote) => Promise<void>;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(initialNote?.content ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ content });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido guardar la nota");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {initialNote ? "Editar nota" : "Nueva nota"}
        </h2>
        <Field label="Contenido" hint="Markdown plano. La primera línea es el título.">
          <textarea
            required
            autoFocus
            rows={9}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`${inputClass} resize-y font-mono leading-relaxed`}
          />
        </Field>
        {error && (
          <p role="alert" className="text-xs" style={{ color: "var(--status-critical)" }}>
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" tone="ink" disabled={submitting}>
            {submitting ? "Guardando…" : initialNote ? "Guardar cambios" : "Crear nota"}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
