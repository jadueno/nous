import "dotenv/config";
import { pool } from "./infrastructure/db/pool.js";
import { buildServer } from "./infrastructure/http/server.js";
import { createVoyageEmbeddingProvider } from "./infrastructure/llm/voyageProvider.js";
import { createAnthropicLLMProvider } from "./infrastructure/llm/anthropicProvider.js";
import { createOllamaEmbeddingProvider, createOllamaLLMProvider } from "./infrastructure/llm/ollamaProvider.js";
import { createFakeEmbeddingProvider, createFakeLLMProvider } from "./infrastructure/llm/fakeProvider.js";

const port = Number(process.env.PORT ?? 3002);

// Orden de prioridad: API de pago (mejor calidad, si algún día se añade) > Ollama
// local (gratis, privado, recomendado para uso personal) > simulado (sin nada
// configurado, para poder clonar y correr la app sin instalar nada).
const embeddingProvider = process.env.VOYAGE_API_KEY
  ? createVoyageEmbeddingProvider(process.env.VOYAGE_API_KEY)
  : process.env.OLLAMA_BASE_URL
    ? createOllamaEmbeddingProvider(process.env.OLLAMA_BASE_URL)
    : createFakeEmbeddingProvider();

const llmProvider = process.env.ANTHROPIC_API_KEY
  ? createAnthropicLLMProvider(process.env.ANTHROPIC_API_KEY)
  : process.env.OLLAMA_BASE_URL
    ? createOllamaLLMProvider(process.env.OLLAMA_BASE_URL)
    : createFakeLLMProvider();

async function main() {
  const app = await buildServer(pool, embeddingProvider, llmProvider, { apiToken: process.env.API_TOKEN });
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
