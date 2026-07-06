import "dotenv/config";
import { pool } from "./infrastructure/db/pool.js";
import { buildServer } from "./infrastructure/http/server.js";
import { createVoyageEmbeddingProvider } from "./infrastructure/llm/voyageProvider.js";
import { createAnthropicLLMProvider } from "./infrastructure/llm/anthropicProvider.js";
import { createFakeEmbeddingProvider, createFakeLLMProvider } from "./infrastructure/llm/fakeProvider.js";

const port = Number(process.env.PORT ?? 3002);

// Sin claves configuradas, arranca igualmente con proveedores simulados: se puede
// clonar y correr la app sin pagar ni configurar nada, aunque las respuestas del
// chat sean genéricas hasta que se añadan ANTHROPIC_API_KEY y VOYAGE_API_KEY.
const embeddingProvider = process.env.VOYAGE_API_KEY
  ? createVoyageEmbeddingProvider(process.env.VOYAGE_API_KEY)
  : createFakeEmbeddingProvider();

const llmProvider = process.env.ANTHROPIC_API_KEY
  ? createAnthropicLLMProvider(process.env.ANTHROPIC_API_KEY)
  : createFakeLLMProvider();

async function main() {
  const app = await buildServer(pool, embeddingProvider, llmProvider, { apiToken: process.env.API_TOKEN });
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
