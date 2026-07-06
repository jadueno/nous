import type { FastifyInstance } from "fastify";
import type { createNoteUseCases } from "../../application/notes.js";
import type { NewNote } from "../../domain/types.js";

type NoteUseCases = ReturnType<typeof createNoteUseCases>;

export function registerNoteRoutes(app: FastifyInstance, useCases: NoteUseCases): void {
  app.get("/notes", async () => useCases.list());

  app.get("/notes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const note = await useCases.get(id);
    if (!note) return reply.code(404).send({ error: "Nota no encontrada" });
    return note;
  });

  app.post("/notes", async (request, reply) => {
    try {
      const note = await useCases.create(request.body as NewNote);
      return reply.code(201).send(note);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "Error desconocido" });
    }
  });

  app.put("/notes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const note = await useCases.update(id, request.body as NewNote);
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
