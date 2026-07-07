import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { Field, inputClass } from "../../components/Field";
import { ChatIcon, SparkleIcon } from "../../components/icons";
import { useChat } from "../../data/useChat";

export function ChatScreen() {
  const { messages, loading, error, sending, sendError, ask, clear } = useChat();
  const [question, setQuestion] = useState("");
  const confirm = useConfirm();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || sending) return;
    setQuestion("");
    await ask(trimmed);
  }

  async function handleClear() {
    if (await confirm("¿Vaciar toda la conversación? Esta acción no se puede deshacer.")) {
      await clear();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Chat
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">Pregúntale a tus notas, en lenguaje natural.</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Vaciar conversación
          </Button>
        )}
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
          <Button type="submit" tone="clay" disabled={sending || !question.trim()}>
            {sending ? "Preguntando…" : "Preguntar"}
          </Button>
        </form>
      </Card>

      {error && (
        <Card
          style={{
            borderColor: "var(--status-critical)",
            backgroundColor: "color-mix(in srgb, var(--status-critical) 8%, var(--surface-1))",
          }}
        >
          <p role="alert" className="text-sm" style={{ color: "var(--status-critical)" }}>
            No se ha podido cargar la conversación ({error}).
          </p>
        </Card>
      )}

      {!loading && !error && messages.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          <ChatIcon className="size-8 text-[var(--text-muted)]" />
          <p className="max-w-sm text-sm text-[var(--text-muted)]">
            Todavía no le has preguntado nada. Escribe una pregunta arriba para empezar.
          </p>
        </Card>
      )}

      {messages.length > 0 && (
        <div className="flex flex-col gap-3">
          {messages.map((m) =>
            m.role === "user" ? (
              <div
                key={m.id}
                className="ml-auto max-w-[85%] rounded-xl bg-[var(--ink)] px-4 py-2.5 text-[15px] whitespace-pre-wrap text-[var(--on-ink)]"
              >
                {m.content}
              </div>
            ) : (
              <Card
                key={m.id}
                className="mr-auto max-w-[85%]"
                style={{
                  borderColor: "var(--accent-clay)",
                  backgroundColor: "color-mix(in srgb, var(--accent-clay) 6%, var(--surface-1))",
                }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--accent-clay)" }}>
                  <SparkleIcon className="size-4" />
                  Nous
                </div>
                {m.content ? (
                  <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap text-[var(--text-primary)]">
                    {m.content}
                  </p>
                ) : (
                  // Mensaje en borrador (streaming): todavía no ha llegado ningún trozo.
                  <span role="status" aria-label="Pensando…" className="mt-2 flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-[var(--accent-clay)] [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-[var(--accent-clay)] [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-[var(--accent-clay)]" />
                  </span>
                )}
              </Card>
            ),
          )}
        </div>
      )}

      {sendError && (
        <Card
          style={{
            borderColor: "var(--status-critical)",
            backgroundColor: "color-mix(in srgb, var(--status-critical) 8%, var(--surface-1))",
          }}
        >
          <p role="alert" className="text-sm" style={{ color: "var(--status-critical)" }}>
            No se ha podido responder ({sendError}).
          </p>
        </Card>
      )}
    </div>
  );
}
