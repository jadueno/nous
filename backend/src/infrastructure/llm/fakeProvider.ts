import type { EmbeddingProvider, LLMProvider } from "../../domain/ports.js";
import type { RetrievedChunk } from "../../domain/types.js";

const DIMENSIONS = 1024;

/** Embedding "hashing trick" (bolsa de palabras con hash, normalizado a longitud 1):
 * determinista y sin red, pero con similitud coseno que sí refleja solapamiento de
 * palabras — suficiente para que los tests de integración y E2E verifiquen ranking
 * real sin depender de una API de pago ni de claves. */
function hashEmbedding(text: string): number[] {
  const vector = new Array(DIMENSIONS).fill(0);
  const words = text.toLowerCase().match(/[a-záéíóúñü0-9]+/gi) ?? [];
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
    vector[hash % DIMENSIONS] += 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

export function createFakeEmbeddingProvider(): EmbeddingProvider {
  return {
    embed: async (texts) => texts.map(hashEmbedding),
  };
}

export function createFakeLLMProvider(): LLMProvider {
  return {
    answer: async (question: string, context: RetrievedChunk[]) => {
      const titles = [...new Set(context.map((c) => c.noteTitle))].join(", ");
      return `[respuesta simulada] Sobre "${question}", según tus notas (${titles}).`;
    },
  };
}
