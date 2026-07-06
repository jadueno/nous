import type { FastifyInstance } from "fastify";
import type { createAskUseCase } from "../../application/ask.js";

export function registerAskRoutes(app: FastifyInstance, useCase: ReturnType<typeof createAskUseCase>): void {
  app.post("/ask", async (request, reply) => {
    const { question } = request.body as { question?: string };
    try {
      return await useCase.ask(question ?? "");
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "Error desconocido" });
    }
  });
}
