import type { Pool } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPool, resetDatabase } from "../../../test/testPool.js";
import { createNoteRepository } from "./noteRepository.js";

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

describe("noteRepository", () => {
  it("crea, lee, actualiza y borra una nota", async () => {
    const repo = createNoteRepository(pool);

    const created = await repo.create({ title: "Primera nota", content: "Contenido inicial" });
    expect(created.title).toBe("Primera nota");

    const fetched = await repo.get(created.id);
    expect(fetched).toMatchObject({ title: "Primera nota", content: "Contenido inicial" });

    const updated = await repo.update(created.id, { title: "Nota editada", content: "Nuevo contenido" });
    expect(updated).toMatchObject({ title: "Nota editada", content: "Nuevo contenido" });

    await repo.remove(created.id);
    expect(await repo.get(created.id)).toBeNull();
  });

  it("list() devuelve las notas ordenadas por última actualización, más reciente primero", async () => {
    const repo = createNoteRepository(pool);
    const first = await repo.create({ title: "A", content: "a" });
    await repo.create({ title: "B", content: "b" });
    await repo.update(first.id, { title: "A editada", content: "a2" });

    const notes = await repo.list();
    expect(notes[0].title).toBe("A editada");
  });

  it("update() sobre un id inexistente devuelve null", async () => {
    const repo = createNoteRepository(pool);
    expect(await repo.update("00000000-0000-0000-0000-000000000000", { title: "X", content: "x" })).toBeNull();
  });
});
