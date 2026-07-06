import type { ChunkRepository, EmbeddingProvider, LLMProvider } from "../domain/ports.js";
import type { Answer, RetrievedChunk } from "../domain/types.js";

const TOP_K = 5;

function toCitations(context: RetrievedChunk[]): Answer["citations"] {
  // De-duplicar por nota: varias citas de la misma nota se colapsan en una sola,
  // con el fragmento más relevante (ya vienen ordenados por score desc).
  const seen = new Set<string>();
  const citations: Answer["citations"] = [];
  for (const c of context) {
    if (seen.has(c.chunk.noteId)) continue;
    seen.add(c.chunk.noteId);
    citations.push({ noteId: c.chunk.noteId, noteTitle: c.noteTitle, excerpt: c.chunk.content });
  }
  return citations;
}

export function createAskUseCase(
  chunkRepository: ChunkRepository,
  embeddingProvider: EmbeddingProvider,
  llmProvider: LLMProvider,
) {
  return {
    ask: async (question: string): Promise<Answer> => {
      if (!question.trim()) throw new Error("La pregunta no puede estar vacía");

      const [embedding] = await embeddingProvider.embed([question]);
      const context = await chunkRepository.searchSimilar(embedding, TOP_K);

      if (context.length === 0) {
        return { text: "Todavía no tienes notas guardadas para responder a esto.", citations: [] };
      }

      const text = await llmProvider.answer(question, context);
      return { text, citations: toCitations(context) };
    },
  };
}
