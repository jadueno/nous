import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { Pool } from "pg";
import { createNoteUseCases } from "../../application/notes.js";
import { createChatUseCase } from "../../application/chat.js";
import type { EmbeddingProvider, LLMProvider } from "../../domain/ports.js";
import { registerAuth } from "./auth.js";
import { registerNoteRoutes } from "./noteRoutes.js";
import { registerChatRoutes } from "./chatRoutes.js";
import { createNoteRepository } from "../db/repositories/noteRepository.js";
import { createChunkRepository } from "../db/repositories/chunkRepository.js";
import { createChatRepository } from "../db/repositories/chatRepository.js";

export async function buildServer(
  pool: Pool,
  embeddingProvider: EmbeddingProvider,
  llmProvider: LLMProvider,
  options: { logger?: boolean; apiToken?: string } = {},
) {
  const app = Fastify({ logger: options.logger ?? true });

  // CSP desactivada a propósito: esta API solo devuelve JSON, nunca HTML/JS, así que
  // una Content-Security-Policy (pensada para páginas renderizadas) no aporta nada aquí.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true, methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] });
  // Límite generoso: la app la usa una sola persona, así que esto no debería notarse
  // nunca en uso normal, solo frena un abuso (o un bug) que dispare peticiones sin control.
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  app.get("/health", async () => ({ status: "ok" }));

  registerAuth(app, options.apiToken);

  const noteRepository = createNoteRepository(pool);
  const chunkRepository = createChunkRepository(pool);
  const chatRepository = createChatRepository(pool);

  registerNoteRoutes(app, createNoteUseCases(noteRepository, chunkRepository, embeddingProvider));
  registerChatRoutes(app, createChatUseCase(chatRepository, chunkRepository, embeddingProvider, llmProvider));

  return app;
}
