import type { EmbeddingProvider, LLMProvider } from "../../domain/ports.js";
import type { RetrievedChunk } from "../../domain/types.js";
import { buildRagPrompt } from "./prompt.js";

/**
 * Adaptadores reales corriendo en local vía Ollama (http://localhost:11434 por
 * defecto) — cero coste, sin clave de API, las notas nunca salen del Mac. Misma
 * interfaz (puerto) que los adaptadores de Voyage/Anthropic: se puede cambiar de uno
 * a otro sin tocar el dominio ni los casos de uso, es la razón de ser de estos puertos.
 *
 * `mxbai-embed-large` da 1024 dimensiones, la misma que fija la migración de
 * `chunks.embedding` — si se cambia de modelo de embeddings local hace falta
 * revisar esa dimensión.
 */
export function createOllamaEmbeddingProvider(baseUrl: string, model = "mxbai-embed-large"): EmbeddingProvider {
  return {
    embed: async (texts: string[]): Promise<number[][]> => {
      const embeddings: number[][] = [];
      for (const text of texts) {
        const res = await fetch(`${baseUrl}/api/embeddings`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model, prompt: text }),
        });
        if (!res.ok) {
          throw new Error(`Ollama (embeddings) respondió ${res.status}: ${await res.text()}`);
        }
        const body = (await res.json()) as { embedding: number[] };
        embeddings.push(body.embedding);
      }
      return embeddings;
    },
  };
}

export function createOllamaLLMProvider(baseUrl: string, model = "qwen2.5:7b-instruct"): LLMProvider {
  return {
    answer: async (question: string, context: RetrievedChunk[]): Promise<string> => {
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, prompt: buildRagPrompt(question, context), stream: false }),
      });
      if (!res.ok) {
        throw new Error(`Ollama (generación) respondió ${res.status}: ${await res.text()}`);
      }
      const body = (await res.json()) as { response: string };
      return body.response;
    },
  };
}
