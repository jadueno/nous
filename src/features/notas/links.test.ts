import { describe, expect, it } from "vitest";
import type { Note } from "../../data/types";
import { extractLinkedTitles, findBacklinks, resolveLinkedNotes } from "./links";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "Nota",
    content: "contenido",
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("extractLinkedTitles", () => {
  it("extrae los títulos entre [[ ]], recortando espacios", () => {
    expect(extractLinkedTitles("Ver [[ Receta de pan ]] y [[Viaje a Roma]]")).toEqual([
      "Receta de pan",
      "Viaje a Roma",
    ]);
  });

  it("sin ningún enlace, devuelve un array vacío", () => {
    expect(extractLinkedTitles("Texto sin enlaces")).toEqual([]);
  });

  it("descarta duplicados exactos, conservando el primer orden de aparición", () => {
    expect(extractLinkedTitles("[[A]] y otra vez [[A]], además [[B]]")).toEqual(["A", "B"]);
  });

  it("ignora un [[ ]] vacío", () => {
    expect(extractLinkedTitles("[[  ]] y [[Real]]")).toEqual(["Real"]);
  });
});

describe("resolveLinkedNotes", () => {
  it("resuelve los enlaces contra notas reales, sin distinguir mayúsculas/minúsculas", () => {
    const pan = note({ id: "1", title: "Receta de pan" });
    const otra = note({ id: "2", title: "Otra nota" });
    const linked = resolveLinkedNotes("Sigue [[receta DE pan]]", [pan, otra]);
    expect(linked).toEqual([pan]);
  });

  it("un enlace roto (a un título que no existe) se ignora sin más", () => {
    const pan = note({ id: "1", title: "Receta de pan" });
    expect(resolveLinkedNotes("Ver [[Nota que no existe]]", [pan])).toEqual([]);
  });

  it("sin enlaces en el contenido, devuelve un array vacío sin recorrer las notas", () => {
    const pan = note({ id: "1", title: "Receta de pan" });
    expect(resolveLinkedNotes("Sin enlaces aquí", [pan])).toEqual([]);
  });
});

describe("findBacklinks", () => {
  it("encuentra las notas cuyo contenido menciona el título de la nota objetivo", () => {
    const pan = note({ id: "1", title: "Receta de pan" });
    const compra = note({ id: "2", title: "Lista de la compra", content: "Harina para [[Receta de pan]]" });
    const suelta = note({ id: "3", title: "Nota suelta", content: "Nada que ver" });

    expect(findBacklinks(pan, [pan, compra, suelta])).toEqual([compra]);
  });

  it("una nota nunca es su propio backlink, aunque se enlace a sí misma", () => {
    const auto = note({ id: "1", title: "Auto", content: "Ver [[Auto]]" });
    expect(findBacklinks(auto, [auto])).toEqual([]);
  });

  it("sin ninguna nota que la mencione, devuelve un array vacío", () => {
    const pan = note({ id: "1", title: "Receta de pan" });
    const suelta = note({ id: "2", title: "Suelta", content: "Nada" });
    expect(findBacklinks(pan, [pan, suelta])).toEqual([]);
  });
});
