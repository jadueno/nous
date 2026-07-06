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

    const created = await repo.create({ title: "Primera nota", content: "Contenido inicial", tags: [] });
    expect(created).toMatchObject({ title: "Primera nota", content: "Contenido inicial", tags: [] });

    const updated = await repo.update(created.id, { title: "Nota editada", content: "Nuevo contenido", tags: [] });
    expect(updated).toMatchObject({ title: "Nota editada", content: "Nuevo contenido" });

    await repo.remove(created.id);
    expect(await repo.list()).toEqual([]);
  });

  it("list() devuelve las notas ordenadas por última actualización, más reciente primero", async () => {
    const repo = createNoteRepository(pool);
    const first = await repo.create({ title: "A", content: "a", tags: [] });
    await repo.create({ title: "B", content: "b", tags: [] });
    await repo.update(first.id, { title: "A editada", content: "a2", tags: [] });

    const notes = await repo.list();
    expect(notes[0].title).toBe("A editada");
  });

  it("update() sobre un id inexistente devuelve null", async () => {
    const repo = createNoteRepository(pool);
    expect(
      await repo.update("00000000-0000-0000-0000-000000000000", { title: "X", content: "x", tags: [] }),
    ).toBeNull();
  });

  it("guarda las etiquetas de una nota y las devuelve ordenadas alfabéticamente", async () => {
    const repo = createNoteRepository(pool);

    const created = await repo.create({ title: "Nota", content: "x", tags: ["flor", "comida"] });
    expect(created.tags).toEqual(["comida", "flor"]);
  });

  it("update() sustituye por completo las etiquetas anteriores", async () => {
    const repo = createNoteRepository(pool);
    const created = await repo.create({ title: "Nota", content: "x", tags: ["comida"] });

    const updated = await repo.update(created.id, { title: "Nota", content: "x", tags: ["viajes"] });

    expect(updated?.tags).toEqual(["viajes"]);
  });

  it("reutiliza una etiqueta existente en vez de duplicarla", async () => {
    const repo = createNoteRepository(pool);
    await repo.create({ title: "Nota A", content: "x", tags: ["comida"] });
    await repo.create({ title: "Nota B", content: "y", tags: ["comida"] });

    expect(await repo.listTags()).toEqual(["comida"]);
  });

  it("list({ tag }) filtra solo las notas con esa etiqueta", async () => {
    const repo = createNoteRepository(pool);
    await repo.create({ title: "Nota A", content: "x", tags: ["comida"] });
    await repo.create({ title: "Nota B", content: "y", tags: ["viajes"] });

    const filtered = await repo.list({ tag: "comida" });
    expect(filtered.map((n) => n.title)).toEqual(["Nota A"]);
  });
});
