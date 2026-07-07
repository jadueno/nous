import { PassThrough } from "node:stream";
import type { FastifyInstance } from "fastify";
import type { createChatUseCase } from "../../application/chat.js";

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function registerChatRoutes(app: FastifyInstance, useCase: ReturnType<typeof createChatUseCase>): void {
  app.get("/messages", async () => useCase.listMessages());

  // SSE (no un único JSON): el chat necesita ver la respuesta aparecer palabra a
  // palabra, no esperar a que el LLM termine entero. Se valida la pregunta ANTES de
  // empezar a emitir el stream (para poder devolver un 400 normal); cualquier error
  // posterior (proveedor caído a mitad de generación) se manda como evento "error"
  // dentro del propio stream, porque a esas alturas la respuesta ya ha empezado.
  app.post("/messages", async (request, reply) => {
    const { question } = request.body as { question?: string };
    if (!question?.trim()) {
      return reply.code(400).send({ error: "La pregunta no puede estar vacía" });
    }

    const stream = new PassThrough();
    reply.raw.setHeader("content-type", "text/event-stream");
    reply.raw.setHeader("cache-control", "no-cache");
    reply.raw.setHeader("connection", "keep-alive");

    useCase
      .ask(question, (chunk) => stream.write(sseFrame("token", { chunk })))
      .then((result) => stream.end(sseFrame("done", result)))
      .catch((err) => stream.end(sseFrame("error", { error: err instanceof Error ? err.message : "Error desconocido" })));

    return reply.send(stream);
  });

  app.delete("/messages", async (_request, reply) => {
    await useCase.clearMessages();
    return reply.code(204).send();
  });
}
