/** Lee un `Response` cuyo cuerpo es NDJSON (una línea = un objeto JSON), como el que
 * devuelve Ollama con `stream: true`. Se procesa por líneas a medida que llegan los
 * trozos de red, sin esperar a que el cuerpo entero esté disponible. */
export async function readNdjsonLines(res: Response, onLine: (line: string) => void): Promise<void> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) onLine(line);
    }
  }
  if (buffer.trim()) onLine(buffer);
}

/** Lee un `Response` en formato SSE (bloques `event: ...\ndata: ...\n\n`), como el que
 * devuelve la API de Anthropic con `stream: true`. */
export async function readSSEEvents(res: Response, onEvent: (event: string, data: string) => void): Promise<void> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) parseSSEFrame(frame, onEvent);
  }
  if (buffer.trim()) parseSSEFrame(buffer, onEvent);
}

function parseSSEFrame(frame: string, onEvent: (event: string, data: string) => void): void {
  const lines = frame.split("\n");
  const event = lines.find((l) => l.startsWith("event: "))?.slice("event: ".length);
  const data = lines.find((l) => l.startsWith("data: "))?.slice("data: ".length);
  if (event && data) onEvent(event, data);
}
