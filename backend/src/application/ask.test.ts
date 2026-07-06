import { describe, expect, it } from "vitest";
import type { ChunkRepository, EmbeddingProvider, LLMProvider } from "../domain/ports.js";
import type { RetrievedChunk } from "../domain/types.js";
import { createAskUseCase } from "./ask.js";

const fakeEmbeddingProvider: EmbeddingProvider = {
  embed: async (texts) => texts.map(() => [1, 0, 0]),
};

function chunkRepositoryReturning(results: RetrievedChunk[]): ChunkRepository {
  return {
    replaceForNote: async () => {},
    removeForNote: async () => {},
    searchSimilar: async () => results,
  };
}

describe("createAskUseCase", () => {
  it("sin notas guardadas, responde con un aviso en vez de llamar al LLM", async () => {
    const chunkRepository = chunkRepositoryReturning([]);
    let llmCalled = false;
    const llmProvider: LLMProvider = { answer: async () => ((llmCalled = true), "no debería llamarse") };
    const useCase = createAskUseCase(chunkRepository, fakeEmbeddingProvider, llmProvider);

    const answer = await useCase.ask("¿Qué apunté sobre X?");

    expect(llmCalled).toBe(false);
    expect(answer.citations).toEqual([]);
    expect(answer.text).toMatch(/no tienes notas/i);
  });

  it("con contexto recuperado, cita las notas de origen sin duplicar la misma nota dos veces", async () => {
    const context: RetrievedChunk[] = [
      { chunk: { id: "c1", noteId: "n1", content: "Fragmento A", position: 0 }, noteTitle: "Nota 1", score: 0.9 },
      { chunk: { id: "c2", noteId: "n1", content: "Fragmento B", position: 1 }, noteTitle: "Nota 1", score: 0.8 },
      { chunk: { id: "c3", noteId: "n2", content: "Fragmento C", position: 0 }, noteTitle: "Nota 2", score: 0.7 },
    ];
    const chunkRepository = chunkRepositoryReturning(context);
    const llmProvider: LLMProvider = { answer: async () => "Respuesta generada" };
    const useCase = createAskUseCase(chunkRepository, fakeEmbeddingProvider, llmProvider);

    const answer = await useCase.ask("¿Qué apunté sobre X?");

    expect(answer.text).toBe("Respuesta generada");
    expect(answer.citations).toEqual([
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
    const useCase = createAskUseCase(chunkRepository, fakeEmbeddingProvider, llmProvider);

    const answer = await useCase.ask("¿Algo totalmente distinto?");

    expect(llmCalled).toBe(false);
    expect(answer.citations).toEqual([]);
    expect(answer.text).toMatch(/no he encontrado ninguna nota relevante/i);
  });

  it("descarta del contexto los trozos por debajo del umbral, aunque otros sí lo superen", async () => {
    const context: RetrievedChunk[] = [
      { chunk: { id: "c1", noteId: "n1", content: "Relevante", position: 0 }, noteTitle: "Nota relevante", score: 0.9 },
      { chunk: { id: "c2", noteId: "n2", content: "Ruido", position: 0 }, noteTitle: "Nota ajena", score: 0.05 },
    ];
    const chunkRepository = chunkRepositoryReturning(context);
    const llmProvider: LLMProvider = { answer: async () => "Respuesta generada" };
    const useCase = createAskUseCase(chunkRepository, fakeEmbeddingProvider, llmProvider);

    const answer = await useCase.ask("¿Qué apunté sobre X?");

    expect(answer.citations).toEqual([{ noteId: "n1", noteTitle: "Nota relevante", excerpt: "Relevante" }]);
  });

  it("rechaza una pregunta vacía", async () => {
    const chunkRepository = chunkRepositoryReturning([]);
    const llmProvider: LLMProvider = { answer: async () => "" };
    const useCase = createAskUseCase(chunkRepository, fakeEmbeddingProvider, llmProvider);

    await expect(useCase.ask("   ")).rejects.toThrow("pregunta");
  });
});
