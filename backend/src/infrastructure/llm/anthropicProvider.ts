import type { LLMProvider } from "../../domain/ports.js";
import type { RetrievedChunk } from "../../domain/types.js";

function buildPrompt(question: string, context: RetrievedChunk[]): string {
  const sources = context
    .map((c, i) => `[${i + 1}] (${c.noteTitle})\n${c.chunk.content}`)
    .join("\n\n");
  return `Responde a la pregunta usando SOLO la información de las fuentes de abajo. Si no está, di que no lo sabes.

Fuentes:
${sources}

Pregunta: ${question}`;
}

/** Adaptador real del LLM: Claude (Anthropic). Sin SDK a propósito — una sola llamada
 * HTTP no justifica la dependencia extra, igual que el resto del proyecto evita capas
 * de indirección sin beneficio claro. */
export function createAnthropicLLMProvider(apiKey: string): LLMProvider {
  return {
    answer: async (question: string, context: RetrievedChunk[]): Promise<string> => {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 1024,
          messages: [{ role: "user", content: buildPrompt(question, context) }],
        }),
      });
      if (!res.ok) {
        throw new Error(`Anthropic respondió ${res.status}: ${await res.text()}`);
      }
      const body = (await res.json()) as { content: { type: string; text?: string }[] };
      return body.content.find((block) => block.type === "text")?.text ?? "";
    },
  };
}
