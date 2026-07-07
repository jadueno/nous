import type { EmbeddingProvider, LLMProvider } from "../../domain/ports.js";
import type { ChatMessage, RetrievedChunk } from "../../domain/types.js";
import { buildSystemPrompt } from "./prompt.js";
import { readNdjsonLines } from "./streaming.js";

/**
 * Adaptadores reales corriendo en local vía Ollama (http://localhost:11434 por
 * defecto) — cero coste, sin clave de API, las notas nunca salen del Mac. Misma
 * interfaz (puerto) que los adaptadores de Voyage/Anthropic: se puede cambiar de uno
 * a otro sin tocar el dominio ni los casos de uso, es la razón de ser de estos puertos.
 *
 * `mxbai-embed-large` da 1024 dimensiones, la misma que fija la migración de
 * `chunks.embedding` — si se cambia de modelo de embeddings local hace falta
 * revisar esa dimensión.
 */
export function createOllamaEmbeddingProvider(baseUrl: string, model = "mxbai-embed-large"): EmbeddingProvider {
  return {
    embed: async (texts: string[]): Promise<number[][]> => {
      const embeddings: number[][] = [];
      for (const text of texts) {
        const res = await fetch(`${baseUrl}/api/embeddings`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model, prompt: text }),
        });
        if (!res.ok) {
          throw new Error(`Ollama (embeddings) respondió ${res.status}: ${await res.text()}`);
        }
        const body = (await res.json()) as { embedding: number[] };
        embeddings.push(body.embedding);
      }
      return embeddings;
    },
  };
}

export function createOllamaLLMProvider(baseUrl: string, model = "qwen2.5:7b-instruct"): LLMProvider {
  return {
    // /api/chat (no /api/generate): soporta mensajes con rol de forma nativa, así el
    // historial de la conversación entra como turnos reales en vez de tener que
    // aplanarlo a mano dentro de un único string de prompt. Con stream:true, Ollama
    // devuelve NDJSON (una línea = un trozo) en vez de esperar a tener la respuesta
    // entera — así el chat puede mostrar el texto según se genera.
    answer: async (
      question: string,
      context: RetrievedChunk[],
      history: ChatMessage[],
      onToken: (chunk: string) => void,
    ): Promise<string> => {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: buildSystemPrompt(context) },
            ...history.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: question },
          ],
          stream: true,
        }),
      });
      if (!res.ok) {
        throw new Error(`Ollama (generación) respondió ${res.status}: ${await res.text()}`);
      }
      let fullText = "";
      await readNdjsonLines(res, (line) => {
        const parsed = JSON.parse(line) as { message?: { content: string } };
        if (parsed.message?.content) {
          fullText += parsed.message.content;
          onToken(parsed.message.content);
        }
      });
      return fullText;
    },
  };
}
