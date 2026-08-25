import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Field, inputClass } from "../../components/Field";
import { TagInput } from "../../components/TagInput";
import type { NewNote, Note } from "../../data/types";
import { findBacklinks, resolveLinkedNotes } from "./links";

const linkChipClass =
  "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors hover:brightness-95";
const linkChipStyle = {
  backgroundColor: "color-mix(in srgb, var(--accent-moss) 14%, var(--surface-1))",
  color: "var(--accent-moss)",
};

/** Fila de notas relacionadas (enlazadas o que enlazan a esta), como chips clicables
 * que saltan a esa nota. Comparte el estilo visual de los chips de etiqueta (mismo
 * `--accent-moss`) para no introducir un cuarto color de marca solo para esto. */
function RelatedNotes({ label, notes, onJump }: { label: string; notes: Note[]; onJump: (note: Note) => void }) {
  if (notes.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-[var(--text-muted)]">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {notes.map((note) => (
          <button key={note.id} type="button" onClick={() => onJump(note)} className={linkChipClass} style={linkChipStyle}>
            {note.title}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Formulario de crear/editar nota: mismo componente para ambos casos, distinguidos por
 * si se recibe `initialNote`. Un solo campo de contenido — el título se deriva solo de
 * la primera línea, así que no hay nada más que rellenar para una nota rápida.
 *
 * `allNotes` (la lista completa, ya cargada por la pantalla) sirve para resolver los
 * enlaces `[[Título]]` del contenido y encontrar qué otras notas enlazan a esta —
 * con el contenido de todas las notas ya en el cliente, no hace falta ningún cambio
 * de backend ni tabla de relación propia para esto. */
export function NoteForm({
  initialNote,
  allNotes,
  onSubmit,
  onCancel,
  onJumpToNote,
}: {
  initialNote?: Note;
  allNotes: Note[];
  onSubmit: (note: NewNote) => Promise<void>;
  onCancel: () => void;
  onJumpToNote: (note: Note) => void;
}) {
  const [content, setContent] = useState(initialNote?.content ?? "");
  const [tags, setTags] = useState<string[]>(initialNote?.tags ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkedNotes = resolveLinkedNotes(content, allNotes).filter((n) => n.id !== initialNote?.id);
  const backlinks = initialNote ? findBacklinks(initialNote, allNotes) : [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ content, tags });
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
        <Field
          label="Contenido"
          hint="Markdown plano. La primera línea es el título. Escribe [[Título de otra nota]] para enlazarla."
        >
          <textarea
            required
            autoFocus
            rows={9}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`${inputClass} resize-y font-mono leading-relaxed`}
          />
        </Field>
        <TagInput label="Etiquetas" tags={tags} onChange={setTags} />
        <RelatedNotes label="Enlaza a" notes={linkedNotes} onJump={onJumpToNote} />
        <RelatedNotes label="Notas que la mencionan" notes={backlinks} onJump={onJumpToNote} />
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
