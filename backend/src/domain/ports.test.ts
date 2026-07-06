import { describe, expect, it } from "vitest";
import { chunkText } from "./ports.js";

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
