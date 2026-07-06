import type { ChunkRepository, EmbeddingProvider } from "../domain/ports.js";
import type { RetrievedChunk } from "../domain/types.js";

const TOP_K = 10;

export function createSearchUseCase(chunkRepository: ChunkRepository, embeddingProvider: EmbeddingProvider) {
  return {
    search: async (query: string): Promise<RetrievedChunk[]> => {
      if (!query.trim()) return [];
      const [embedding] = await embeddingProvider.embed([query]);
      return chunkRepository.searchSimilar(embedding, TOP_K);
    },
  };
}
