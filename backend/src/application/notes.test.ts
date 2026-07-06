import { describe, expect, it, vi } from "vitest";
import type { ChunkRepository, EmbeddingProvider, NoteRepository } from "../domain/ports.js";
import type { Note } from "../domain/types.js";
import { createNoteUseCases } from "./notes.js";

function fakeNoteRepository(): NoteRepository {
  const notes = new Map<string, Note>();
  let counter = 0;
  return {
    list: async (filter) => {
      const all = [...notes.values()];
      return filter?.tag ? all.filter((n) => n.tags.includes(filter.tag!)) : all;
    },
    create: async (input) => {
      const note: Note = { id: `n${++counter}`, ...input, createdAt: "2026-01-01", updatedAt: "2026-01-01" };
      notes.set(note.id, note);
      return note;
    },
    update: async (id, input) => {
      const existing = notes.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...input };
      notes.set(id, updated);
      return updated;
    },
    remove: async (id) => {
      notes.delete(id);
    },
    listTags: async () => [...new Set([...notes.values()].flatMap((n) => n.tags))].sort(),
  };
}

function fakeChunkRepository(): ChunkRepository & {
  calls: { noteId: string; count: number }[];
  storedChunks: { content: string; position: number }[];
} {
  const calls: { noteId: string; count: number }[] = [];
  const storedChunks: { content: string; position: number }[] = [];
  return {
    calls,
    storedChunks,
    replaceForNote: async (noteId, chunks) => {
      calls.push({ noteId, count: chunks.length });
      storedChunks.push(...chunks.map((c) => ({ content: c.content, position: c.position })));
    },
    removeForNote: async () => {},
    searchSimilar: async () => [],
  };
}

const fakeEmbeddingProvider: EmbeddingProvider = {
  embed: async (texts) => texts.map(() => [0, 0, 0]),
};

describe("createNoteUseCases", () => {
  it("crear una nota válida la vectoriza (trocea + embebe) y deriva el título de la primera línea", async () => {
    const noteRepository = fakeNoteRepository();
    const chunkRepository = fakeChunkRepository();
    const useCases = createNoteUseCases(noteRepository, chunkRepository, fakeEmbeddingProvider);

    const note = await useCases.create({ content: "Primera nota\nResto del contenido de prueba", tags: [] });

    expect(note.title).toBe("Primera nota");
    expect(chunkRepository.calls).toEqual([{ noteId: note.id, count: 1 }]);
  });

  it("el título y las etiquetas entran en el embedding (para que se encuentren al buscar) pero no se guardan en el extracto mostrado", async () => {
    const noteRepository = fakeNoteRepository();
    const chunkRepository = fakeChunkRepository();
    const embedSpy = vi.fn(async (texts: string[]) => texts.map(() => [0, 0, 0]));
    const useCases = createNoteUseCases(noteRepository, chunkRepository, { embed: embedSpy });

    await useCases.create({
      content: "Comida que le gusta a Flor\nLe gusta el McDonald's",
      tags: ["comida", "flor"],
    });

    expect(embedSpy).toHaveBeenCalledWith([
      "Comida que le gusta a Flor\ncomida\nflor\n\nComida que le gusta a Flor\nLe gusta el McDonald's",
    ]);
    expect(chunkRepository.storedChunks).toEqual([
      { content: "Comida que le gusta a Flor\nLe gusta el McDonald's", position: 0 },
    ]);
  });

  it("normaliza las etiquetas (recorta espacios y quita duplicados) antes de guardarlas", async () => {
    const noteRepository = fakeNoteRepository();
    const chunkRepository = fakeChunkRepository();
    const useCases = createNoteUseCases(noteRepository, chunkRepository, fakeEmbeddingProvider);

    const note = await useCases.create({ content: "Nota", tags: ["  comida  ", "comida", "", "flor"] });

    expect(note.tags).toEqual(["comida", "flor"]);
  });

  it("una nota de una sola línea muy larga trunca el título derivado", async () => {
    const noteRepository = fakeNoteRepository();
    const chunkRepository = fakeChunkRepository();
    const useCases = createNoteUseCases(noteRepository, chunkRepository, fakeEmbeddingProvider);

    const longLine = "a".repeat(100);
    const note = await useCases.create({ content: longLine, tags: [] });

    expect(note.title).toBe(`${"a".repeat(80)}…`);
  });

  it("rechaza una nota con contenido vacío sin llegar a vectorizar nada", async () => {
    const noteRepository = fakeNoteRepository();
    const chunkRepository = fakeChunkRepository();
    const useCases = createNoteUseCases(noteRepository, chunkRepository, fakeEmbeddingProvider);

    await expect(useCases.create({ content: "   ", tags: [] })).rejects.toThrow("contenido");
    expect(chunkRepository.calls).toEqual([]);
  });

  it("al eliminar una nota, borra también sus trozos", async () => {
    const noteRepository = fakeNoteRepository();
    const chunkRepository = fakeChunkRepository();
    const removeSpy = vi.spyOn(chunkRepository, "removeForNote");
    const useCases = createNoteUseCases(noteRepository, chunkRepository, fakeEmbeddingProvider);

    const note = await useCases.create({ content: "Nota\nX", tags: [] });
    await useCases.remove(note.id);

    expect(removeSpy).toHaveBeenCalledWith(note.id);
    expect(await noteRepository.list()).toEqual([]);
  });

  it("list() con filtro de etiqueta solo devuelve las notas que la llevan", async () => {
    const noteRepository = fakeNoteRepository();
    const chunkRepository = fakeChunkRepository();
    const useCases = createNoteUseCases(noteRepository, chunkRepository, fakeEmbeddingProvider);

    await useCases.create({ content: "Nota A", tags: ["comida"] });
    await useCases.create({ content: "Nota B", tags: ["viajes"] });

    const filtered = await useCases.list({ tag: "comida" });
    expect(filtered.map((n) => n.title)).toEqual(["Nota A"]);
  });

  it("listTags() devuelve todas las etiquetas usadas, sin duplicados", async () => {
    const noteRepository = fakeNoteRepository();
    const chunkRepository = fakeChunkRepository();
    const useCases = createNoteUseCases(noteRepository, chunkRepository, fakeEmbeddingProvider);

    await useCases.create({ content: "Nota A", tags: ["comida", "flor"] });
    await useCases.create({ content: "Nota B", tags: ["comida"] });

    expect(await useCases.listTags()).toEqual(["comida", "flor"]);
  });
});
