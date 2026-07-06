import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Field, inputClass } from "../../components/Field";
import { ChatIcon, SparkleIcon } from "../../components/icons";
import { askApi } from "../../data/api";
import type { Answer } from "../../data/types";

type Status = "idle" | "loading" | "error" | "done";

export function ChatScreen() {
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || status === "loading") return;
    setStatus("loading");
    setError(null);
    setAskedQuestion(trimmed);
    try {
      const result = await askApi.ask(trimmed);
      setAnswer(result);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido obtener una respuesta");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">Chat</h1>
        <p className="text-sm text-[var(--text-secondary)]">Pregúntale a tus notas, en lenguaje natural.</p>
      </div>

      <Card>
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
          <div className="flex-1">
            <Field label="Tu pregunta">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="¿Qué apunté sobre…?"
                className={inputClass}
              />
            </Field>
          </div>
          <Button type="submit" tone="indigo" disabled={status === "loading" || !question.trim()}>
            {status === "loading" ? "Preguntando…" : "Preguntar"}
          </Button>
        </form>
      </Card>

      {status === "idle" && (
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          <ChatIcon className="size-8 text-[var(--text-muted)]" />
          <p className="max-w-sm text-sm text-[var(--text-muted)]">
            Todavía no le has preguntado nada. Escribe una pregunta arriba para empezar.
          </p>
        </Card>
      )}

      {status === "loading" && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-2 text-sm text-[var(--text-muted)]"
        >
          <span className="flex gap-1" aria-hidden="true">
            <span className="size-1.5 animate-bounce rounded-full bg-[var(--accent-indigo)] [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-[var(--accent-indigo)] [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-[var(--accent-indigo)]" />
          </span>
          Pensando…
        </div>
      )}

      {status === "error" && (
        <Card
          style={{
            borderColor: "var(--status-critical)",
            backgroundColor: "color-mix(in srgb, var(--status-critical) 8%, var(--surface-1))",
          }}
        >
          <p role="alert" className="text-sm" style={{ color: "var(--status-critical)" }}>
            No se ha podido responder ({error}).
          </p>
        </Card>
      )}

      {status === "done" && answer && (
        <Card
          style={{
            borderColor: "var(--accent-indigo)",
            backgroundColor: "color-mix(in srgb, var(--accent-indigo) 6%, var(--surface-1))",
          }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--accent-indigo)" }}>
            <SparkleIcon className="size-4" />
            Respuesta a "{askedQuestion}"
          </div>
          <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap text-[var(--text-primary)]">
            {answer.text}
          </p>
        </Card>
      )}
    </div>
  );
}
