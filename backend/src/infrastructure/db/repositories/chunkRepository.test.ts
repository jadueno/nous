import type { Pool } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPool, resetDatabase } from "../../../test/testPool.js";
import { createNoteRepository } from "./noteRepository.js";
import { createChunkRepository } from "./chunkRepository.js";

let pool: Pool;

beforeAll(() => {
  pool = createTestPool();
});

afterEach(async () => {
  await resetDatabase(pool);
});

afterAll(async () => {
  await pool.end();
});

/** Vector unitario en la dimensión `dim` de 1024, el resto a 0 — para poder razonar
 * a mano sobre similitud coseno esperada en los tests. */
function unitVector(dim: number): number[] {
  const v = new Array(1024).fill(0);
  v[dim] = 1;
  return v;
}

describe("chunkRepository", () => {
  it("replaceForNote sustituye por completo los trozos anteriores de la nota", async () => {
    const notes = createNoteRepository(pool);
    const chunks = createChunkRepository(pool);
    const note = await notes.create({ title: "Nota", content: "...", tags: [] });

    await chunks.replaceForNote(note.id, [{ content: "v1", position: 0, embedding: unitVector(0) }]);
    await chunks.replaceForNote(note.id, [{ content: "v2", position: 0, embedding: unitVector(1) }]);

    const results = await chunks.searchSimilar(unitVector(1), 10);
    expect(results.map((r) => r.chunk.content)).toEqual(["v2"]);
  });

  it("searchSimilar ordena por similitud coseno, más parecido primero", async () => {
    const notes = createNoteRepository(pool);
    const chunks = createChunkRepository(pool);
    const noteA = await notes.create({ title: "Nota A", content: "...", tags: [] });
    const noteB = await notes.create({ title: "Nota B", content: "...", tags: [] });

    await chunks.replaceForNote(noteA.id, [{ content: "sobre gatos", position: 0, embedding: unitVector(0) }]);
    await chunks.replaceForNote(noteB.id, [{ content: "sobre coches", position: 0, embedding: unitVector(1) }]);

    const results = await chunks.searchSimilar(unitVector(0), 10);

    expect(results[0]).toMatchObject({ noteTitle: "Nota A", score: expect.closeTo(1, 5) });
    expect(results[1]).toMatchObject({ noteTitle: "Nota B" });
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("borrar una nota borra en cascada sus trozos", async () => {
    const notes = createNoteRepository(pool);
    const chunks = createChunkRepository(pool);
    const note = await notes.create({ title: "Nota", content: "...", tags: [] });
    await chunks.replaceForNote(note.id, [{ content: "x", position: 0, embedding: unitVector(0) }]);

    await notes.remove(note.id);

    expect(await chunks.searchSimilar(unitVector(0), 10)).toEqual([]);
  });
});
