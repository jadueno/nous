import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPool, resetDatabase } from "../../test/testPool.js";
import { createFakeEmbeddingProvider, createFakeLLMProvider } from "../llm/fakeProvider.js";
import { buildServer } from "./server.js";

/** POST /messages responde en SSE (streaming), no un único JSON — se parsean los
 * bloques `event: ...\ndata: ...` para poder inspeccionar el evento final ("done"). */
function parseSSE(payload: string): { event: string; data: unknown }[] {
  return payload
    .split("\n\n")
    .filter((frame) => frame.trim())
    .map((frame) => {
      const lines = frame.split("\n");
      const event = lines.find((l) => l.startsWith("event: "))!.slice("event: ".length);
      const data = lines.find((l) => l.startsWith("data: "))!.slice("data: ".length);
      return { event, data: JSON.parse(data) };
    });
}

let pool: Pool;
let app: FastifyInstance;

beforeAll(async () => {
  pool = createTestPool();
  app = await buildServer(pool, createFakeEmbeddingProvider(), createFakeLLMProvider(), { logger: false });
});

afterEach(async () => {
  await resetDatabase(pool);
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe("GET /health", () => {
  it("responde ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});

describe("CRUD /notes", () => {
  it("crea, lista, actualiza y borra una nota, extremo a extremo vía HTTP", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/notes",
      payload: { content: "Mi primera nota\nAlgo interesante que aprendí hoy." },
    });
    expect(create.statusCode).toBe(201);
    const note = create.json();
    expect(note.title).toBe("Mi primera nota");

    const list = await app.inject({ method: "GET", url: "/notes" });
    expect(list.json()).toHaveLength(1);

    const update = await app.inject({
      method: "PUT",
      url: `/notes/${note.id}`,
      payload: { content: "Editada\nContenido nuevo" },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().title).toBe("Editada");

    const remove = await app.inject({ method: "DELETE", url: `/notes/${note.id}` });
    expect(remove.statusCode).toBe(204);

    const listAfter = await app.inject({ method: "GET", url: "/notes" });
    expect(listAfter.json()).toEqual([]);
  });

  it("rechaza crear una nota con contenido vacío", async () => {
    const res = await app.inject({ method: "POST", url: "/notes", payload: { content: "   " } });
    expect(res.statusCode).toBe(400);
  });

});

describe("etiquetas", () => {
  it("guarda las etiquetas al crear/editar y GET /notes?tag= filtra por ellas", async () => {
    const noteA = await app.inject({
      method: "POST",
      url: "/notes",
      payload: { content: "Nota A", tags: ["comida", "flor"] },
    });
    expect(noteA.json().tags).toEqual(["comida", "flor"]);

    await app.inject({ method: "POST", url: "/notes", payload: { content: "Nota B", tags: ["viajes"] } });

    const filtered = await app.inject({ method: "GET", url: "/notes?tag=comida" });
    expect(filtered.json().map((n: { title: string }) => n.title)).toEqual(["Nota A"]);

    const tags = await app.inject({ method: "GET", url: "/tags" });
    expect(tags.json()).toEqual(["comida", "flor", "viajes"]);
  });
});

describe("chat (POST/GET/DELETE /messages)", () => {
  it("responde en streaming (SSE), citando la nota de origen, y persiste pregunta y respuesta", async () => {
    await app.inject({
      method: "POST",
      url: "/notes",
      payload: { content: "Receta de pan\nPara el pan casero hace falta harina, agua, sal y levadura." },
    });

    const res = await app.inject({
      method: "POST",
      url: "/messages",
      payload: { question: "¿Qué hace falta para el pan casero?" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("text/event-stream");
    const events = parseSSE(res.payload);
    expect(events.some((e) => e.event === "token")).toBe(true);

    const done = events.find((e) => e.event === "done")!.data as {
      message: { role: string; content: string };
      citations: { noteTitle: string }[];
    };
    expect(done.citations).toEqual([expect.objectContaining({ noteTitle: "Receta de pan" })]);
    expect(done.message).toMatchObject({ role: "assistant" });

    const messages = await app.inject({ method: "GET", url: "/messages" });
    expect(messages.json()).toMatchObject([
      { role: "user", content: "¿Qué hace falta para el pan casero?" },
      { role: "assistant" },
    ]);
  });

  it("sin notas guardadas, no falla y devuelve cero citas", async () => {
    const res = await app.inject({ method: "POST", url: "/messages", payload: { question: "¿Algo?" } });
    expect(res.statusCode).toBe(200);
    const done = parseSSE(res.payload).find((e) => e.event === "done")!.data as { citations: unknown[] };
    expect(done.citations).toEqual([]);
  });

  it("rechaza una pregunta vacía con un 400 normal (sin llegar a abrir el stream)", async () => {
    const res = await app.inject({ method: "POST", url: "/messages", payload: { question: "   " } });
    expect(res.statusCode).toBe(400);
  });

  it("DELETE /messages vacía la conversación", async () => {
    await app.inject({ method: "POST", url: "/messages", payload: { question: "¿Algo?" } });

    const remove = await app.inject({ method: "DELETE", url: "/messages" });
    expect(remove.statusCode).toBe(204);

    const messages = await app.inject({ method: "GET", url: "/messages" });
    expect(messages.json()).toEqual([]);
  });
});

describe("autenticación opcional (API_TOKEN), de extremo a extremo con el servidor real", () => {
  it("con apiToken configurado, exige el token también en las rutas ya montadas", async () => {
    const authedApp = await buildServer(pool, createFakeEmbeddingProvider(), createFakeLLMProvider(), {
      logger: false,
      apiToken: "demo-token",
    });

    const withoutToken = await authedApp.inject({ method: "GET", url: "/notes" });
    expect(withoutToken.statusCode).toBe(401);

    const health = await authedApp.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);

    const withToken = await authedApp.inject({
      method: "GET",
      url: "/notes",
      headers: { authorization: "Bearer demo-token" },
    });
    expect(withToken.statusCode).toBe(200);

    await authedApp.close();
  });
});
