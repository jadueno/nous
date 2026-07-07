import { useCallback, useEffect, useState } from "react";
import { chatApi } from "./api";
import type { ChatMessage } from "./types";

// Id temporal para el mensaje del usuario, mostrado al instante mientras se espera la
// respuesta del backend (que persiste el mensaje real y devuelve su id definitivo).
function tempId(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setMessages(await chatApi.listMessages());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ask = useCallback(async (question: string) => {
    setSending(true);
    setSendError(null);
    setMessages((prev) => [
      ...prev,
      { id: tempId(), role: "user", content: question, createdAt: new Date().toISOString() },
    ]);
    try {
      const { message } = await chatApi.ask(question);
      setMessages((prev) => [...prev, message]);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "No se ha podido obtener una respuesta");
    } finally {
      setSending(false);
    }
  }, []);

  const clear = useCallback(async () => {
    await chatApi.clear();
    setMessages([]);
  }, []);

  return { messages, loading, error, sending, sendError, ask, clear };
}
