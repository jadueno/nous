import { useState } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { focusRing } from "../../components/Field";
import { ListSkeleton } from "../../components/LoadingState";
import { useNotes } from "../../data/useNotes";
import { useTags } from "../../data/useTags";
import type { Note } from "../../data/types";
import { NoteForm } from "./NoteForm";

function formatUpdated(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// La primera línea con contenido ya se muestra aparte como título (ver deriveTitle
// en el backend) — la preview arranca en la línea siguiente para no repetirla.
function preview(content: string): string {
  const lines = content.trim().split("\n");
  const firstNonEmpty = lines.findIndex((l) => l.trim().length > 0);
  const rest = firstNonEmpty === -1 ? [] : lines.slice(firstNonEmpty + 1);
  const text = rest.slice(0, 3).join(" ").trim();
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
}

export function NotasScreen() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const { notes, loading, error, addNote, updateNote, removeNote } = useNotes(activeTag ?? undefined);
  const allTags = useTags(notes);
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Note | "new" | null>(null);

  async function handleRemove(note: Note) {
    if (await confirm(`¿Eliminar la nota "${note.title}"? Esta acción no se puede deshacer.`)) {
      await removeNote(note.id);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Notas
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {notes.length === 0
              ? "Tu segundo cerebro, todavía vacío."
              : `${notes.length} nota${notes.length === 1 ? "" : "s"} guardada${notes.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button tone="ink" onClick={() => setEditing(editing ? null : "new")}>
          {editing ? "Cancelar" : "+ Nueva nota"}
        </Button>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por etiqueta">
          {allTags.map((tag) => {
            const isActive = tag === activeTag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(isActive ? null : tag)}
                aria-pressed={isActive}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${focusRing} ${
                  isActive ? "bg-[var(--ink)] text-[var(--on-ink)]" : "hover:brightness-95"
                }`}
                style={
                  isActive
                    ? undefined
                    : {
                        backgroundColor: "color-mix(in srgb, var(--accent-moss) 12%, var(--surface-1))",
                        color: "var(--accent-moss)",
                      }
                }
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {editing === "new" && (
        <NoteForm
          onSubmit={async (note) => {
            await addNote(note);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      {editing && editing !== "new" && (
        <NoteForm
          initialNote={editing}
          onSubmit={async (note) => {
            await updateNote(editing.id, note);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {error && (
        <Card
          style={{
            borderColor: "var(--status-critical)",
            backgroundColor: "color-mix(in srgb, var(--status-critical) 8%, var(--surface-1))",
          }}
        >
          <p role="alert" className="text-sm" style={{ color: "var(--status-critical)" }}>
            No se han podido cargar las notas ({error}).
          </p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => window.location.reload()}>
            Recargar
          </Button>
        </Card>
      )}

      {loading && !error && <ListSkeleton />}

      {!loading && !error && notes.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-[var(--text-muted)]">
            {activeTag
              ? `Ninguna nota con la etiqueta "${activeTag}".`
              : "Todavía no tienes ninguna nota. Escribe la primera."}
          </p>
        </Card>
      )}

      {!loading && !error && notes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {notes.map((note) => (
            <Card key={note.id} className="relative flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setEditing(note)}
                className={`flex flex-col gap-1.5 rounded-xl pr-16 text-left ${focusRing}`}
              >
                <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">{note.title}</h2>
                <p className="text-xs text-[var(--text-muted)]">Actualizada {formatUpdated(note.updatedAt)}</p>
                <p className="text-sm text-[var(--text-secondary)]">{preview(note.content)}</p>
              </button>
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--accent-moss) 14%, var(--surface-1))",
                        color: "var(--accent-moss)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemove(note)}
                aria-label={`Eliminar nota ${note.title}`}
                className={`absolute top-5 right-5 rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--gridline)] hover:text-[var(--status-critical)] sm:top-6 sm:right-6 ${focusRing}`}
              >
                Eliminar
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
