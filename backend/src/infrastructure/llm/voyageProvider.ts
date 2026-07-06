import type { EmbeddingProvider } from "../../domain/ports.js";

/** Adaptador real de embeddings: Voyage AI (recomendado por Anthropic como pareja de
 * Claude, ya que Claude no ofrece embeddings propios). "voyage-3" produce vectores de
 * 1024 dimensiones, la misma que fija la migración de la tabla `chunks`. */
export function createVoyageEmbeddingProvider(apiKey: string): EmbeddingProvider {
  return {
    embed: async (texts: string[]): Promise<number[][]> => {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: texts, model: "voyage-3" }),
      });
      if (!res.ok) {
        throw new Error(`Voyage AI respondió ${res.status}: ${await res.text()}`);
      }
      const body = (await res.json()) as { data: { embedding: number[] }[] };
      return body.data.map((d) => d.embedding);
    },
  };
}
