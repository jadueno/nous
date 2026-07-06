import type { FastifyInstance } from "fastify";
import type { createSearchUseCase } from "../../application/search.js";

export function registerSearchRoutes(app: FastifyInstance, useCase: ReturnType<typeof createSearchUseCase>): void {
  app.get("/search", async (request) => {
    const { q } = request.query as { q?: string };
    return useCase.search(q ?? "");
  });
}
