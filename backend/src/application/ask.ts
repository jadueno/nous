import type { ChunkRepository, EmbeddingProvider, LLMProvider } from "../domain/ports.js";
import type { Answer, RetrievedChunk } from "../domain/types.js";

const TOP_K = 5;
// Por debajo de este umbral de similitud coseno, un trozo se considera "ruido" y no
// se cita — sin esto, con pocas notas guardadas `searchSimilar` puede devolver trozos
// totalmente ajenos a la pregunta solo por rellenar el TOP_K, minando la propuesta de
// valor central (citas de verdad, no citas "porque no había nada mejor que devolver").
const MIN_RELEVANCE_SCORE = 0.1;

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
      const retrieved = await chunkRepository.searchSimilar(embedding, TOP_K);
      const context = retrieved.filter((c) => c.score >= MIN_RELEVANCE_SCORE);

      if (retrieved.length === 0) {
        return { text: "Todavía no tienes notas guardadas para responder a esto.", citations: [] };
      }
      if (context.length === 0) {
        return { text: "No he encontrado ninguna nota relevante para responder a esto.", citations: [] };
      }

      const text = await llmProvider.answer(question, context);
      return { text, citations: toCitations(context) };
    },
  };
}
