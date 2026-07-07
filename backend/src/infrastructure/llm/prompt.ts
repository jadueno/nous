import type { RetrievedChunk } from "../../domain/types.js";

/** Instrucciones + notas recuperadas, compartidas entre adaptadores de LLM (Claude,
 * Ollama): mismo comportamiento de "solo con las notas de abajo" y de no inventar,
 * sea cual sea el proveedor real detrás. Se pasa como mensaje de sistema, separado
 * de los turnos de la conversación (ver `ChatMessage[]` en los adaptadores) — así el
 * modelo distingue con claridad los hechos (notas) de la conversación en curso.
 *
 * Sin numerar las fuentes como [1]/[2]: la interfaz de chat no muestra citas (decisión
 * del usuario — quiere la respuesta limpia, sin la "magia" rota por ver de dónde sale
 * cada dato), así que no queremos que el modelo se refiera a ellas como "la fuente 2"
 * dentro de la propia respuesta. */
export function buildSystemPrompt(context: RetrievedChunk[]): string {
  const notes = context.map((c) => `(${c.noteTitle})\n${c.chunk.content}`).join("\n\n");
  return `Responde a la pregunta usando SOLO la información de las notas de abajo, en una respuesta natural y directa. Si no está, di que no lo sabes. No te refieras a las notas por número ni menciones que son "fuentes" — simplemente responde como si lo supieras. Puedes apoyarte en la conversación anterior para entender preguntas de seguimiento (p. ej. "¿y en qué cantidad?"), pero los hechos de la respuesta deben salir siempre de las notas, nunca de la conversación.

Notas:
${notes}`;
}
