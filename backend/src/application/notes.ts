import type { ChunkRepository, EmbeddingProvider, NoteRepository } from "../domain/ports.js";
import { chunkText, deriveTitle, normalizeTags } from "../domain/ports.js";
import type { NewNote, Note } from "../domain/types.js";

function validate(content: string): void {
  if (!content.trim()) throw new Error("El contenido no puede estar vacío");
}

/** Trocea y vectoriza el contenido de una nota, sustituyendo sus trozos anteriores.
 * Se llama tras crear/editar — así la búsqueda semántica y el chat quedan al día.
 *
 * El título y las etiquetas se anteponen SOLO para calcular el embedding, nunca se
 * guardan en `content` del trozo: muchas notas cortas (p. ej. "Comida que le gusta a
 * X" con contenido "Le gusta el McDonald's") llevan la mayor parte del significado en
 * el título/etiquetas, y una búsqueda que solo vectorizara el contenido nunca las
 * encontraría — bug real encontrado al probar la búsqueda con notas de una sola
 * frase. Como el título y las etiquetas ya se muestran aparte en la cita/resultado,
 * no hace falta duplicarlos en el extracto. */
async function ingestNote(
  note: Pick<Note, "id" | "title" | "content" | "tags">,
  chunkRepository: ChunkRepository,
  embeddingProvider: EmbeddingProvider,
): Promise<void> {
  const texts = chunkText(note.content);
  const context = [note.title, ...note.tags].join("\n");
  const embeddings = await embeddingProvider.embed(texts.map((text) => `${context}\n\n${text}`));
  await chunkRepository.replaceForNote(
    note.id,
    texts.map((text, i) => ({ content: text, position: i, embedding: embeddings[i] })),
  );
}

export function createNoteUseCases(
  noteRepository: NoteRepository,
  chunkRepository: ChunkRepository,
  embeddingProvider: EmbeddingProvider,
) {
  return {
    list: (filter?: { tag?: string }): Promise<Note[]> => noteRepository.list(filter),

    get: (id: string): Promise<Note | null> => noteRepository.get(id),

    listTags: (): Promise<string[]> => noteRepository.listTags(),

    create: async (input: NewNote): Promise<Note> => {
      validate(input.content);
      const note = await noteRepository.create({
        title: deriveTitle(input.content),
        content: input.content,
        tags: normalizeTags(input.tags),
      });
      await ingestNote(note, chunkRepository, embeddingProvider);
      return note;
    },

    update: async (id: string, input: NewNote): Promise<Note | null> => {
      validate(input.content);
      const note = await noteRepository.update(id, {
        title: deriveTitle(input.content),
        content: input.content,
        tags: normalizeTags(input.tags),
      });
      if (!note) return null;
      await ingestNote(note, chunkRepository, embeddingProvider);
      return note;
    },

    remove: async (id: string): Promise<void> => {
      await chunkRepository.removeForNote(id);
      await noteRepository.remove(id);
    },
  };
}
