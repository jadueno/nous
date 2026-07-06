import { describe, expect, it } from "vitest";
import { chunkText, deriveTitle, normalizeTags } from "./ports.js";

describe("chunkText", () => {
  it("con un texto corto, devuelve un único trozo", () => {
    expect(chunkText("Una nota corta.")).toEqual(["Una nota corta."]);
  });

  it("agrupa párrafos hasta el límite de caracteres, sin partir un párrafo por la mitad", () => {
    const a = "a".repeat(500);
    const b = "b".repeat(500);
    const c = "c".repeat(100);
    const chunks = chunkText([a, b, c].join("\n\n"), 800);

    expect(chunks).toEqual([a, `${b}\n\n${c}`]);
  });

  it("con contenido vacío, no devuelve trozos vacíos", () => {
    expect(chunkText("   ")).toEqual([]);
  });
});

describe("deriveTitle", () => {
  it("usa la primera línea con contenido, ignorando líneas vacías al principio", () => {
    expect(deriveTitle("\n\n  Comida que le gusta a Flor\nLe gusta el McDonald's")).toBe(
      "Comida que le gusta a Flor",
    );
  });

  it("trunca líneas muy largas a 80 caracteres con puntos suspensivos", () => {
    const longLine = "a".repeat(100);
    expect(deriveTitle(longLine)).toBe(`${"a".repeat(80)}…`);
  });

  it("con contenido en blanco, devuelve un título de reserva en vez de una cadena vacía", () => {
    expect(deriveTitle("   \n  ")).toBe("Sin título");
  });
});

describe("normalizeTags", () => {
  it("recorta espacios y descarta etiquetas vacías", () => {
    expect(normalizeTags(["  comida  ", "", "   ", "flor"])).toEqual(["comida", "flor"]);
  });

  it("quita duplicados exactos, conservando la primera aparición", () => {
    expect(normalizeTags(["comida", "flor", "comida"])).toEqual(["comida", "flor"]);
  });

  it("no fuerza minúsculas: 'Comida' y 'comida' son etiquetas distintas", () => {
    expect(normalizeTags(["Comida", "comida"])).toEqual(["Comida", "comida"]);
  });
});
