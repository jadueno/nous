import type { FastifyInstance } from "fastify";
import type { createNoteUseCases } from "../../application/notes.js";
import type { NewNote } from "../../domain/types.js";

type NoteUseCases = ReturnType<typeof createNoteUseCases>;

/** `tags` es opcional en el body (un cliente puede no mandarlo todavía) — se
 * normaliza aquí, en el borde de entrada, en vez de asumir que siempre llega. */
function parseNewNote(body: unknown): NewNote {
  const { content, tags } = (body ?? {}) as { content?: string; tags?: string[] };
  return { content: content ?? "", tags: Array.isArray(tags) ? tags : [] };
}

export function registerNoteRoutes(app: FastifyInstance, useCases: NoteUseCases): void {
  app.get("/notes", async (request) => {
    const { tag } = request.query as { tag?: string };
    return useCases.list(tag ? { tag } : undefined);
  });

  app.get("/notes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const note = await useCases.get(id);
    if (!note) return reply.code(404).send({ error: "Nota no encontrada" });
    return note;
  });

  app.get("/tags", async () => useCases.listTags());

  app.post("/notes", async (request, reply) => {
    try {
      const note = await useCases.create(parseNewNote(request.body));
      return reply.code(201).send(note);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "Error desconocido" });
    }
  });

  app.put("/notes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const note = await useCases.update(id, parseNewNote(request.body));
      if (!note) return reply.code(404).send({ error: "Nota no encontrada" });
      return note;
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "Error desconocido" });
    }
  });

  app.delete("/notes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await useCases.remove(id);
    return reply.code(204).send();
  });
}
