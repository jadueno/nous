import type { ChatRepository, ChunkRepository, EmbeddingProvider, LLMProvider } from "../domain/ports.js";
import type { AskResult, ChatMessage, RetrievedChunk } from "../domain/types.js";

const TOP_K = 5;
// Por debajo de este umbral de similitud coseno, un trozo se considera "ruido" y no
// se cita — sin esto, con pocas notas guardadas `searchSimilar` puede devolver trozos
// totalmente ajenos a la pregunta solo por rellenar el TOP_K, minando la propuesta de
// valor central (citas de verdad, no citas "porque no había nada mejor que devolver").
const MIN_RELEVANCE_SCORE = 0.1;
// Turnos de conversación pasados al LLM como contexto de seguimiento: suficiente para
// resolver referencias tipo "¿y en qué cantidad?", sin dejar que el prompt crezca sin
// límite a medida que la conversación se alarga.
const HISTORY_LIMIT = 6;

function toCitations(context: RetrievedChunk[]): AskResult["citations"] {
  // De-duplicar por nota: varias citas de la misma nota se colapsan en una sola,
  // con el fragmento más relevante (ya vienen ordenados por score desc).
  const seen = new Set<string>();
  const citations: AskResult["citations"] = [];
  for (const c of context) {
    if (seen.has(c.chunk.noteId)) continue;
    seen.add(c.chunk.noteId);
    citations.push({ noteId: c.chunk.noteId, noteTitle: c.noteTitle, excerpt: c.chunk.content });
  }
  return citations;
}

export function createChatUseCase(
  chatRepository: ChatRepository,
  chunkRepository: ChunkRepository,
  embeddingProvider: EmbeddingProvider,
  llmProvider: LLMProvider,
) {
  return {
    listMessages: (): Promise<ChatMessage[]> => chatRepository.list(),

    clearMessages: (): Promise<void> => chatRepository.clear(),

    // `onToken` recibe cada trozo de la respuesta según se genera (streaming real
    // desde Ollama/Anthropic, ver LLMProvider). También se invoca para las respuestas
    // "enlatadas" (sin notas / sin contexto relevante), como un único trozo — así el
    // llamador no necesita distinguir ambos casos.
    ask: async (question: string, onToken: (chunk: string) => void): Promise<AskResult> => {
      if (!question.trim()) throw new Error("La pregunta no puede estar vacía");

      const history = await chatRepository.list(HISTORY_LIMIT);
      await chatRepository.append("user", question);

      const [embedding] = await embeddingProvider.embed([question]);
      const retrieved = await chunkRepository.searchSimilar(embedding, TOP_K);
      const context = retrieved.filter((c) => c.score >= MIN_RELEVANCE_SCORE);

      let text: string;
      let citations: AskResult["citations"] = [];
      if (retrieved.length === 0) {
        text = "Todavía no tienes notas guardadas para responder a esto.";
        onToken(text);
      } else if (context.length === 0) {
        text = "No he encontrado ninguna nota relevante para responder a esto.";
        onToken(text);
      } else {
        text = await llmProvider.answer(question, context, history, onToken);
        citations = toCitations(context);
      }

      const message = await chatRepository.append("assistant", text);
      return { message, citations };
    },
  };
}
