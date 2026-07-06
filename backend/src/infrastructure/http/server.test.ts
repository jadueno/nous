import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPool, resetDatabase } from "../../test/testPool.js";
import { createFakeEmbeddingProvider, createFakeLLMProvider } from "../llm/fakeProvider.js";
import { buildServer } from "./server.js";

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
      payload: { title: "Mi primera nota", content: "Algo interesante que aprendí hoy." },
    });
    expect(create.statusCode).toBe(201);
    const note = create.json();

    const list = await app.inject({ method: "GET", url: "/notes" });
    expect(list.json()).toHaveLength(1);

    const update = await app.inject({
      method: "PUT",
      url: `/notes/${note.id}`,
      payload: { title: "Editada", content: "Contenido nuevo" },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().title).toBe("Editada");

    const remove = await app.inject({ method: "DELETE", url: `/notes/${note.id}` });
    expect(remove.statusCode).toBe(204);

    const listAfter = await app.inject({ method: "GET", url: "/notes" });
    expect(listAfter.json()).toEqual([]);
  });

  it("rechaza crear una nota sin título", async () => {
    const res = await app.inject({ method: "POST", url: "/notes", payload: { title: "  ", content: "x" } });
    expect(res.statusCode).toBe(400);
  });

  it("GET /notes/:id sobre un id inexistente devuelve 404", async () => {
    const res = await app.inject({ method: "GET", url: "/notes/00000000-0000-0000-0000-000000000000" });
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /ask", () => {
  it("responde citando la nota de origen", async () => {
    await app.inject({
      method: "POST",
      url: "/notes",
      payload: { title: "Receta de pan", content: "Para el pan casero hace falta harina, agua, sal y levadura." },
    });

    const res = await app.inject({
      method: "POST",
      url: "/ask",
      payload: { question: "¿Qué hace falta para el pan casero?" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.citations).toEqual([
      expect.objectContaining({ noteTitle: "Receta de pan" }),
    ]);
  });

  it("sin notas guardadas, no falla y devuelve cero citas", async () => {
    const res = await app.inject({ method: "POST", url: "/ask", payload: { question: "¿Algo?" } });
    expect(res.statusCode).toBe(200);
    expect(res.json().citations).toEqual([]);
  });
});

describe("GET /search", () => {
  it("devuelve los trozos más similares a la búsqueda", async () => {
    await app.inject({
      method: "POST",
      url: "/notes",
      payload: { title: "Notas de viaje", content: "Fuimos a la playa en verano y comimos marisco fresco." },
    });

    const res = await app.inject({ method: "GET", url: "/search?q=playa marisco" });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0]).toMatchObject({ noteTitle: "Notas de viaje" });
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
