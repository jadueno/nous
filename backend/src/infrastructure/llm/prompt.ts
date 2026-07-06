import type { RetrievedChunk } from "../../domain/types.js";

/** Prompt compartido entre adaptadores de LLM (Claude, Ollama): misma instrucción de
 * "solo con las notas de abajo", para que el comportamiento de no inventar sea
 * consistente sea cual sea el proveedor real detrás.
 *
 * Sin numerar las fuentes como [1]/[2]: la interfaz de chat no muestra citas (decisión
 * del usuario — quiere la respuesta limpia, sin la "magia" rota por ver de dónde sale
 * cada dato), así que no queremos que el modelo se refiera a ellas como "la fuente 2"
 * dentro de la propia respuesta. */
export function buildRagPrompt(question: string, context: RetrievedChunk[]): string {
  const notes = context.map((c) => `(${c.noteTitle})\n${c.chunk.content}`).join("\n\n");
  return `Responde a la pregunta usando SOLO la información de las notas de abajo, en una respuesta natural y directa. Si no está, di que no lo sabes. No te refieras a las notas por número ni menciones que son "fuentes" — simplemente responde como si lo supieras.

Notas:
${notes}

Pregunta: ${question}`;
}
