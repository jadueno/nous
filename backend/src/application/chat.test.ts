import { describe, expect, it } from "vitest";
import type { ChatRepository, ChunkRepository, EmbeddingProvider, LLMProvider } from "../domain/ports.js";
import type { ChatMessage, RetrievedChunk } from "../domain/types.js";
import { createChatUseCase } from "./chat.js";

const fakeEmbeddingProvider: EmbeddingProvider = {
  embed: async (texts) => texts.map(() => [1, 0, 0]),
};

const noop = () => {};

function chunkRepositoryReturning(results: RetrievedChunk[]): ChunkRepository {
  return {
    replaceForNote: async () => {},
    removeForNote: async () => {},
    searchSimilar: async () => results,
  };
}

function fakeChatRepository(): ChatRepository {
  const messages: ChatMessage[] = [];
  let counter = 0;
  return {
    list: async (limit) => (limit === undefined ? messages : messages.slice(-limit)),
    append: async (role, content) => {
      const message: ChatMessage = { id: `m${++counter}`, role, content, createdAt: "2026-01-01" };
      messages.push(message);
      return message;
    },
    clear: async () => {
      messages.length = 0;
    },
  };
}

describe("createChatUseCase", () => {
  it("sin notas guardadas, responde con un aviso en vez de llamar al LLM", async () => {
    const chunkRepository = chunkRepositoryReturning([]);
    let llmCalled = false;
    const llmProvider: LLMProvider = { answer: async () => ((llmCalled = true), "no debería llamarse") };
    const useCase = createChatUseCase(fakeChatRepository(), chunkRepository, fakeEmbeddingProvider, llmProvider);

    const result = await useCase.ask("¿Qué apunté sobre X?", noop);

    expect(llmCalled).toBe(false);
    expect(result.citations).toEqual([]);
    expect(result.message.content).toMatch(/no tienes notas/i);
  });

  it("con contexto recuperado, cita las notas de origen sin duplicar la misma nota dos veces", async () => {
    const context: RetrievedChunk[] = [
      { chunk: { id: "c1", noteId: "n1", content: "Fragmento A", position: 0 }, noteTitle: "Nota 1", score: 0.9 },
      { chunk: { id: "c2", noteId: "n1", content: "Fragmento B", position: 1 }, noteTitle: "Nota 1", score: 0.8 },
      { chunk: { id: "c3", noteId: "n2", content: "Fragmento C", position: 0 }, noteTitle: "Nota 2", score: 0.7 },
    ];
    const chunkRepository = chunkRepositoryReturning(context);
    const llmProvider: LLMProvider = { answer: async () => "Respuesta generada" };
    const useCase = createChatUseCase(fakeChatRepository(), chunkRepository, fakeEmbeddingProvider, llmProvider);

    const result = await useCase.ask("¿Qué apunté sobre X?", noop);

    expect(result.message.content).toBe("Respuesta generada");
    expect(result.citations).toEqual([
      { noteId: "n1", noteTitle: "Nota 1", excerpt: "Fragmento A" },
      { noteId: "n2", noteTitle: "Nota 2", excerpt: "Fragmento C" },
    ]);
  });

  it("si todo el contexto recuperado está por debajo del umbral de relevancia, no lo cita ni llama al LLM", async () => {
    const context: RetrievedChunk[] = [
      { chunk: { id: "c1", noteId: "n1", content: "Fragmento ajeno", position: 0 }, noteTitle: "Nota ajena", score: 0.05 },
    ];
    const chunkRepository = chunkRepositoryReturning(context);
    let llmCalled = false;
    const llmProvider: LLMProvider = { answer: async () => ((llmCalled = true), "no debería llamarse") };
    const useCase = createChatUseCase(fakeChatRepository(), chunkRepository, fakeEmbeddingProvider, llmProvider);

    const result = await useCase.ask("¿Algo totalmente distinto?", noop);

    expect(llmCalled).toBe(false);
    expect(result.citations).toEqual([]);
    expect(result.message.content).toMatch(/no he encontrado ninguna nota relevante/i);
  });

  it("descarta del contexto los trozos por debajo del umbral, aunque otros sí lo superen", async () => {
    const context: RetrievedChunk[] = [
      { chunk: { id: "c1", noteId: "n1", content: "Relevante", position: 0 }, noteTitle: "Nota relevante", score: 0.9 },
      { chunk: { id: "c2", noteId: "n2", content: "Ruido", position: 0 }, noteTitle: "Nota ajena", score: 0.05 },
    ];
    const chunkRepository = chunkRepositoryReturning(context);
    const llmProvider: LLMProvider = { answer: async () => "Respuesta generada" };
    const useCase = createChatUseCase(fakeChatRepository(), chunkRepository, fakeEmbeddingProvider, llmProvider);

    const result = await useCase.ask("¿Qué apunté sobre X?", noop);

    expect(result.citations).toEqual([{ noteId: "n1", noteTitle: "Nota relevante", excerpt: "Relevante" }]);
  });

  it("rechaza una pregunta vacía", async () => {
    const chunkRepository = chunkRepositoryReturning([]);
    const llmProvider: LLMProvider = { answer: async () => "" };
    const useCase = createChatUseCase(fakeChatRepository(), chunkRepository, fakeEmbeddingProvider, llmProvider);

    await expect(useCase.ask("   ", noop)).rejects.toThrow("pregunta");
  });

  it("persiste la pregunta y la respuesta como mensajes, recuperables con listMessages()", async () => {
    const chunkRepository = chunkRepositoryReturning([
      { chunk: { id: "c1", noteId: "n1", content: "Relevante", position: 0 }, noteTitle: "Nota", score: 0.9 },
    ]);
    const llmProvider: LLMProvider = { answer: async () => "Respuesta generada" };
    const useCase = createChatUseCase(fakeChatRepository(), chunkRepository, fakeEmbeddingProvider, llmProvider);

    await useCase.ask("¿Qué apunté sobre X?", noop);
    const messages = await useCase.listMessages();

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "user", content: "¿Qué apunté sobre X?" });
    expect(messages[1]).toMatchObject({ role: "assistant", content: "Respuesta generada" });
  });

  it("pasa al LLM los últimos turnos de la conversación como historial, sin incluir la pregunta actual", async () => {
    const chunkRepository = chunkRepositoryReturning([
      { chunk: { id: "c1", noteId: "n1", content: "Relevante", position: 0 }, noteTitle: "Nota", score: 0.9 },
    ]);
    const receivedHistories: ChatMessage[][] = [];
    const llmProvider: LLMProvider = {
      answer: async (_question, _context, history) => {
        receivedHistories.push(history);
        return "Respuesta generada";
      },
    };
    const useCase = createChatUseCase(fakeChatRepository(), chunkRepository, fakeEmbeddingProvider, llmProvider);

    await useCase.ask("Primera pregunta", noop);
    await useCase.ask("Segunda pregunta", noop);

    expect(receivedHistories[0]).toEqual([]);
    expect(receivedHistories[1].map((m) => m.content)).toEqual(["Primera pregunta", "Respuesta generada"]);
  });

  it("clearMessages() vacía la conversación", async () => {
    const chunkRepository = chunkRepositoryReturning([]);
    const llmProvider: LLMProvider = { answer: async () => "" };
    const useCase = createChatUseCase(fakeChatRepository(), chunkRepository, fakeEmbeddingProvider, llmProvider);

    await useCase.ask("¿Algo?", noop);
    await useCase.clearMessages();

    expect(await useCase.listMessages()).toEqual([]);
  });

  it("emite cada trozo generado por el LLM vía onToken, y el mensaje final concatena el texto completo", async () => {
    const chunkRepository = chunkRepositoryReturning([
      { chunk: { id: "c1", noteId: "n1", content: "Relevante", position: 0 }, noteTitle: "Nota", score: 0.9 },
    ]);
    const llmProvider: LLMProvider = {
      answer: async (_question, _context, _history, onToken) => {
        onToken("Hola");
        onToken(" mundo");
        return "Hola mundo";
      },
    };
    const useCase = createChatUseCase(fakeChatRepository(), chunkRepository, fakeEmbeddingProvider, llmProvider);
    const chunks: string[] = [];

    const result = await useCase.ask("¿Qué apunté sobre X?", (chunk) => chunks.push(chunk));

    expect(chunks).toEqual(["Hola", " mundo"]);
    expect(result.message.content).toBe("Hola mundo");
  });

  it("también emite por onToken las respuestas enlatadas (sin notas o sin contexto relevante)", async () => {
    const chunkRepository = chunkRepositoryReturning([]);
    const llmProvider: LLMProvider = { answer: async () => "no debería llamarse" };
    const useCase = createChatUseCase(fakeChatRepository(), chunkRepository, fakeEmbeddingProvider, llmProvider);
    const chunks: string[] = [];

    const result = await useCase.ask("¿Algo?", (chunk) => chunks.push(chunk));

    expect(chunks).toEqual([result.message.content]);
  });
});
