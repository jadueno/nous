import type { FastifyInstance } from "fastify";
import type { createChatUseCase } from "../../application/chat.js";

export function registerChatRoutes(app: FastifyInstance, useCase: ReturnType<typeof createChatUseCase>): void {
  app.get("/messages", async () => useCase.listMessages());

  app.post("/messages", async (request, reply) => {
    const { question } = request.body as { question?: string };
    try {
      return await useCase.ask(question ?? "");
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "Error desconocido" });
    }
  });

  app.delete("/messages", async (_request, reply) => {
    await useCase.clearMessages();
    return reply.code(204).send();
  });
}
