import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Field, inputClass } from "../../components/Field";
import { ListSkeleton } from "../../components/LoadingState";
import { SearchIcon } from "../../components/icons";
import { searchApi } from "../../data/api";
import type { RetrievedChunk } from "../../data/types";

type Status = "idle" | "loading" | "error" | "done";

export function BuscarScreen() {
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<RetrievedChunk[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || status === "loading") return;
    setStatus("loading");
    setError(null);
    setLastQuery(trimmed);
    try {
      const chunks = await searchApi.search(trimmed);
      setResults([...chunks].sort((a, b) => b.score - a.score));
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido completar la búsqueda");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">Buscar</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Búsqueda semántica directa: encuentra fragmentos por significado, no solo por palabra exacta.
        </p>
      </div>

      <Card>
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
          <div className="flex-1">
            <Field label="Qué estás buscando">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Una palabra, una idea, un recuerdo…"
                className={inputClass}
              />
            </Field>
          </div>
          <Button type="submit" tone="teal" disabled={status === "loading" || !query.trim()}>
            {status === "loading" ? "Buscando…" : "Buscar"}
          </Button>
        </form>
      </Card>

      {status === "idle" && (
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          <SearchIcon className="size-8 text-[var(--text-muted)]" />
          <p className="max-w-sm text-sm text-[var(--text-muted)]">
            Escribe algo arriba para buscar en el contenido de tus notas.
          </p>
        </Card>
      )}

      {status === "loading" && <ListSkeleton columns={1} label="Buscando…" />}

      {status === "error" && (
        <Card
          style={{
            borderColor: "var(--status-critical)",
            backgroundColor: "color-mix(in srgb, var(--status-critical) 8%, var(--surface-1))",
          }}
        >
          <p role="alert" className="text-sm" style={{ color: "var(--status-critical)" }}>
            No se ha podido buscar ({error}).
          </p>
        </Card>
      )}

      {status === "done" && results.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No se ha encontrado nada relacionado con "{lastQuery}". Prueba con otras palabras.
          </p>
        </Card>
      )}

      {status === "done" && results.length > 0 && (
        <div className="flex flex-col gap-3">
          {results.map((r) => (
            <Card key={r.chunk.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-[var(--text-primary)]">{r.noteTitle}</h2>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                  style={{
                    color: "var(--accent-teal)",
                    backgroundColor: "color-mix(in srgb, var(--accent-teal) 14%, var(--surface-1))",
                  }}
                >
                  {Math.round(r.score * 100)}% similar
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{r.chunk.content}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
