import type { ChunkRepository, EmbeddingProvider, NoteRepository } from "../domain/ports.js";
import { chunkText } from "../domain/ports.js";
import type { NewNote, Note } from "../domain/types.js";

function validate(note: NewNote): void {
  if (!note.title.trim()) throw new Error("El título no puede estar vacío");
  if (!note.content.trim()) throw new Error("El contenido no puede estar vacío");
}

/** Trocea y vectoriza el contenido de una nota, sustituyendo sus trozos anteriores.
 * Se llama tras crear/editar — así la búsqueda semántica y el chat quedan al día. */
async function ingestNote(
  noteId: string,
  content: string,
  chunkRepository: ChunkRepository,
  embeddingProvider: EmbeddingProvider,
): Promise<void> {
  const texts = chunkText(content);
  const embeddings = await embeddingProvider.embed(texts);
  await chunkRepository.replaceForNote(
    noteId,
    texts.map((text, i) => ({ content: text, position: i, embedding: embeddings[i] })),
  );
}

export function createNoteUseCases(
  noteRepository: NoteRepository,
  chunkRepository: ChunkRepository,
  embeddingProvider: EmbeddingProvider,
) {
  return {
    list: (): Promise<Note[]> => noteRepository.list(),

    get: (id: string): Promise<Note | null> => noteRepository.get(id),

    create: async (input: NewNote): Promise<Note> => {
      validate(input);
      const note = await noteRepository.create(input);
      await ingestNote(note.id, note.content, chunkRepository, embeddingProvider);
      return note;
    },

    update: async (id: string, input: NewNote): Promise<Note | null> => {
      validate(input);
      const note = await noteRepository.update(id, input);
      if (!note) return null;
      await ingestNote(note.id, note.content, chunkRepository, embeddingProvider);
      return note;
    },

    remove: async (id: string): Promise<void> => {
      await chunkRepository.removeForNote(id);
      await noteRepository.remove(id);
    },
  };
}
