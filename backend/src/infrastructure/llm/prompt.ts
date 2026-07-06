import type { RetrievedChunk } from "../../domain/types.js";

/** Prompt compartido entre adaptadores de LLM (Claude, Ollama): misma instrucción de
 * "solo con las fuentes de abajo", para que el comportamiento de citar (o no
 * inventar) sea consistente sea cual sea el proveedor real detrás. */
export function buildRagPrompt(question: string, context: RetrievedChunk[]): string {
  const sources = context.map((c, i) => `[${i + 1}] (${c.noteTitle})\n${c.chunk.content}`).join("\n\n");
  return `Responde a la pregunta usando SOLO la información de las fuentes de abajo. Si no está, di que no lo sabes.

Fuentes:
${sources}

Pregunta: ${question}`;
}
