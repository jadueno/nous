import type { LLMProvider } from "../../domain/ports.js";
import type { ChatMessage, RetrievedChunk } from "../../domain/types.js";
import { buildSystemPrompt } from "./prompt.js";
import { readSSEEvents } from "./streaming.js";

interface ContentBlockDelta {
  type: "content_block_delta";
  delta: { type: "text_delta"; text: string };
}

/** Adaptador real del LLM: Claude (Anthropic). Sin SDK a propósito — una sola llamada
 * HTTP no justifica la dependencia extra, igual que el resto del proyecto evita capas
 * de indirección sin beneficio claro. */
export function createAnthropicLLMProvider(apiKey: string): LLMProvider {
  return {
    answer: async (
      question: string,
      context: RetrievedChunk[],
      history: ChatMessage[],
      onToken: (chunk: string) => void,
    ): Promise<string> => {
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
          system: buildSystemPrompt(context),
          messages: [...history.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: question }],
          stream: true,
        }),
      });
      if (!res.ok) {
        throw new Error(`Anthropic respondió ${res.status}: ${await res.text()}`);
      }
      let fullText = "";
      await readSSEEvents(res, (event, data) => {
        if (event !== "content_block_delta") return;
        const parsed = JSON.parse(data) as ContentBlockDelta;
        if (parsed.delta.type !== "text_delta") return;
        fullText += parsed.delta.text;
        onToken(parsed.delta.text);
      });
      return fullText;
    },
  };
}
